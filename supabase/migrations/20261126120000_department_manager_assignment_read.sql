-- Department management support (read-only expansions + head designation).
--
-- 1) department.manage holders can SELECT staff_department_assignments rows for
--    departments inside their organization (previously staff.manage only).
-- 2) department.manage holders can SELECT the staff_memberships rows that have
--    a department assignment, so the department workspace can resolve names.
--    Profiles remain readable via the existing colleague-read policy.
-- 3) set_department_head() atomically designates the single primary
--    (department head) assignment for a department. Mutations still require
--    staff.manage through the existing RLS policies.
--
-- Recursion note: the staff_memberships policy must NOT query
-- staff_department_assignments inline — the existing assignment policies
-- already query staff_memberships inline, which would recurse (42P17).
-- private.membership_has_department_assignment() is security definer and
-- bypasses RLS, breaking the cycle.

create or replace function private.membership_has_department_assignment(p_membership_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_department_assignments a
    where a.membership_id = p_membership_id
  );
$$;

revoke all on function private.membership_has_department_assignment(uuid) from public, anon;
grant execute on function private.membership_has_department_assignment(uuid) to authenticated, service_role;

-- Idempotent: drop-then-create so the migration is safe to re-run.
drop policy if exists staff_department_assignments_department_manager_read
  on public.staff_department_assignments;

create policy staff_department_assignments_department_manager_read
  on public.staff_department_assignments
  for select to authenticated
  using (
    exists (
      select 1
      from public.departments d
      where d.id = staff_department_assignments.department_id
        and private.has_permission(d.organization_id, 'department.manage')
    )
  );

drop policy if exists staff_memberships_department_assignee_read
  on public.staff_memberships;

create policy staff_memberships_department_assignee_read
  on public.staff_memberships
  for select to authenticated
  using (
    private.has_permission(organization_id, 'department.manage')
    and private.membership_has_department_assignment(id)
  );

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

  -- Single statement: clear existing primaries then set the new head, so the
  -- department never has zero or two primaries visible between statements.
  with cleared as (
    update public.staff_department_assignments
    set is_primary = false
    where department_id = p_department_id
      and is_primary = true
    returning membership_id
  )
  update public.staff_department_assignments
  set is_primary = true
  where department_id = p_department_id
    and membership_id = p_membership_id;
end;
$$;

revoke all on function public.set_department_head(uuid, uuid) from public, anon;
grant execute on function public.set_department_head(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
