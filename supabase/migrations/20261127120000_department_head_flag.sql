-- Dedicated department-head designation.
--
-- is_primary keeps its existing meaning (a clinician's primary department,
-- managed by replace_clinician_assignments). Department head is now a
-- separate boolean so the two concepts cannot interfere.
--
-- Safety properties:
-- * partial unique index guarantees at most one head per department;
-- * set_department_head() swaps the flag in a single UPDATE statement so
--   the department never has zero or two heads mid-transaction;
-- * the function stays SECURITY INVOKER — writes still pass through the
--   existing staff.manage RLS policies, no privilege escalation;
-- * replace_clinician_assignments preserves is_department_head for
--   departments that remain assigned to the clinician.

alter table public.staff_department_assignments
  add column if not exists is_department_head boolean not null default false;

create unique index if not exists staff_department_assignments_one_head_idx
  on public.staff_department_assignments(department_id)
  where is_department_head;

comment on column public.staff_department_assignments.is_department_head is
  'Department head designation. Independent of is_primary (clinician primary department). At most one true value per department, enforced by staff_department_assignments_one_head_idx.';

create or replace function public.set_department_head(p_department_id uuid, p_membership_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select d.organization_id into v_org
  from public.departments d
  where d.id = p_department_id;
  if not found then
    raise exception 'Department not found.' using errcode = 'P0002';
  end if;

  if not private.has_permission(v_org, 'staff.manage') then
    raise exception 'You do not have permission to manage department staff.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.staff_department_assignments a
    join public.staff_memberships m on m.id = a.membership_id
    where a.department_id = p_department_id
      and a.membership_id = p_membership_id
      and m.organization_id = v_org
  ) then
    raise exception 'That staff member is not assigned to this department.' using errcode = 'P0001';
  end if;

  -- Single statement: every current head and the target row are updated in
  -- one atomic operation. Under READ COMMITTED a concurrent swap serializes
  -- on row locks; the partial unique index is the final guard, so a race
  -- can never leave two heads (the loser gets a unique violation).
  update public.staff_department_assignments
  set is_department_head = (membership_id = p_membership_id)
  where department_id = p_department_id
    and (is_department_head or membership_id = p_membership_id);
end;
$$;

revoke all on function public.set_department_head(uuid, uuid) from public, anon;
grant execute on function public.set_department_head(uuid, uuid) to authenticated;

-- Preserve department-head flags when clinician assignments are replaced.
-- The function deletes and reinserts staff_department_assignments rows;
-- without this, saving a doctor's departments would silently clear heads.
create or replace function public.replace_clinician_assignments(
  p_membership_id uuid,
  p_department_ids jsonb,
  p_service_ids jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_department_count integer;
  v_service_count integer;
  v_head_department_ids uuid[];
begin
  if jsonb_typeof(p_department_ids) <> 'array' or jsonb_typeof(p_service_ids) <> 'array' then
    raise exception 'Assignments must be arrays.';
  end if;

  select m.organization_id into v_organization_id
  from public.staff_memberships m
  join public.roles r on r.id = m.role_id and r.role_key = 'doctor'
  where m.id = p_membership_id
    and private.has_permission(m.organization_id, 'staff.manage');

  if v_organization_id is null then
    raise exception 'Doctor account is not available.';
  end if;

  select count(distinct d.id)::integer into v_department_count
  from jsonb_array_elements_text(p_department_ids) requested(value)
  join public.departments d on d.id = requested.value::uuid
    and d.organization_id = v_organization_id;

  if v_department_count <> jsonb_array_length(p_department_ids) then
    raise exception 'One or more departments are not available for this organization.';
  end if;

  select count(distinct s.id)::integer into v_service_count
  from jsonb_array_elements_text(p_service_ids) requested(value)
  join public.services s on s.id = requested.value::uuid
    and s.organization_id = v_organization_id
  where s.department_id is null
     or p_department_ids ? s.department_id::text;

  if v_service_count <> jsonb_array_length(p_service_ids) then
    raise exception 'One or more services are not available for the selected departments.';
  end if;

  -- Remember which departments this clinician currently heads before the
  -- delete; re-apply below for departments that remain assigned.
  select coalesce(array_agg(department_id), '{}'::uuid[]) into v_head_department_ids
  from public.staff_department_assignments
  where membership_id = p_membership_id
    and is_department_head;

  delete from public.staff_service_assignments where membership_id = p_membership_id;
  delete from public.staff_department_assignments where membership_id = p_membership_id;

  insert into public.staff_department_assignments (membership_id, department_id, is_primary)
  select p_membership_id, item.value::uuid, item.ordinality = 1
  from jsonb_array_elements_text(p_department_ids) with ordinality as item(value, ordinality);

  get diagnostics v_department_count = row_count;
  if v_department_count <> jsonb_array_length(p_department_ids) then
    raise exception 'Department replacement count mismatch.';
  end if;

  -- Restore head flags only where the department is still assigned; a
  -- department the clinician left simply loses its head (no dangling ref,
  -- since the flag lives on the assignment row itself).
  update public.staff_department_assignments
  set is_department_head = true
  where membership_id = p_membership_id
    and department_id = any(v_head_department_ids);

  insert into public.staff_service_assignments (membership_id, service_id, is_active)
  select p_membership_id, item.value::uuid, true
  from jsonb_array_elements_text(p_service_ids) as item(value);

  get diagnostics v_service_count = row_count;
  if v_service_count <> jsonb_array_length(p_service_ids) then
    raise exception 'Service replacement count mismatch.';
  end if;

  return jsonb_build_object('departments', v_department_count, 'services', v_service_count);
end;
$$;

revoke all on function public.replace_clinician_assignments(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.replace_clinician_assignments(uuid, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';
