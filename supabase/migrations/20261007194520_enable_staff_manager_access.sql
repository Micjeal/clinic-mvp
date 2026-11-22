-- Allow organization staff managers to administer staff memberships and
-- department assignments through the authenticated/RLS path.
-- Self-read policies remain in place for ordinary staff members.

create policy staff_memberships_manager_read
  on public.staff_memberships
  for select
  to authenticated
  using (private.has_permission(organization_id, 'staff.manage'));

create policy staff_memberships_manager_update
  on public.staff_memberships
  for update
  to authenticated
  using (private.has_permission(organization_id, 'staff.manage'))
  with check (
    private.has_permission(organization_id, 'staff.manage')
    and (
      role_id is null
      or exists (
        select 1
        from public.roles r
        where r.id = staff_memberships.role_id
          and (r.organization_id is null or r.organization_id = staff_memberships.organization_id)
      )
    )
    and (
      primary_facility_id is null
      or exists (
        select 1
        from public.facilities f
        where f.id = staff_memberships.primary_facility_id
          and f.organization_id = staff_memberships.organization_id
      )
    )
  );

create policy staff_department_assignments_manager_read
  on public.staff_department_assignments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.staff_memberships m
      where m.id = staff_department_assignments.membership_id
        and private.has_permission(m.organization_id, 'staff.manage')
    )
  );

create policy staff_department_assignments_manager_insert
  on public.staff_department_assignments
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.staff_memberships m
      join public.departments d on d.id = staff_department_assignments.department_id
      where m.id = staff_department_assignments.membership_id
        and m.organization_id = d.organization_id
        and private.has_permission(m.organization_id, 'staff.manage')
    )
  );

create policy staff_department_assignments_manager_update
  on public.staff_department_assignments
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.staff_memberships m
      where m.id = staff_department_assignments.membership_id
        and private.has_permission(m.organization_id, 'staff.manage')
    )
  )
  with check (
    exists (
      select 1
      from public.staff_memberships m
      join public.departments d on d.id = staff_department_assignments.department_id
      where m.id = staff_department_assignments.membership_id
        and m.organization_id = d.organization_id
        and private.has_permission(m.organization_id, 'staff.manage')
    )
  );

create policy staff_department_assignments_manager_delete
  on public.staff_department_assignments
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.staff_memberships m
      where m.id = staff_department_assignments.membership_id
        and private.has_permission(m.organization_id, 'staff.manage')
    )
  );

grant select on public.staff_memberships to authenticated;
grant update (role_id, primary_facility_id, employee_number, job_title, registration_number, is_active)
  on public.staff_memberships to authenticated;

grant select, insert, delete on public.staff_department_assignments to authenticated;
grant update (is_primary) on public.staff_department_assignments to authenticated;

notify pgrst, 'reload schema';

;
