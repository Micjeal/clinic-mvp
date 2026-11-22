
    drop policy if exists organizations_member_read on public.organizations;
    create policy organizations_authenticated_read
    on public.organizations for select to authenticated
    using (
      (is_public and status = 'active')
      or private.is_org_member(id)
    );

    drop policy if exists facilities_member_read on public.facilities;
    create policy facilities_authenticated_read
    on public.facilities for select to authenticated
    using (
      (is_public and is_active)
      or private.is_org_member(organization_id)
    );

    drop policy if exists departments_member_read on public.departments;
    create policy departments_authenticated_read
    on public.departments for select to authenticated
    using (
      (is_public and is_active)
      or private.is_org_member(organization_id)
    );

    drop policy if exists services_member_read on public.services;
    create policy services_authenticated_read
    on public.services for select to authenticated
    using (
      (is_public and is_active)
      or private.is_org_member(organization_id)
    );

    create or replace function private.appointment_scope_valid(
      target_organization_id uuid,
      target_facility_id uuid,
      target_department_id uuid,
      target_service_id uuid
    )
    returns boolean
    language sql
    stable
    security definer
    set search_path = ''
    as $$
      select exists (
        select 1
        from public.facilities f
        join public.departments d
          on d.id = target_department_id
         and d.facility_id = f.id
         and d.organization_id = f.organization_id
        where f.id = target_facility_id
          and f.organization_id = target_organization_id
          and (
            target_service_id is null
            or exists (
              select 1
              from public.services s
              where s.id = target_service_id
                and s.organization_id = target_organization_id
                and (s.facility_id is null or s.facility_id = target_facility_id)
                and (s.department_id is null or s.department_id = target_department_id)
                and s.is_active
            )
          )
      );
    $$;

    revoke all on function private.appointment_scope_valid(uuid, uuid, uuid, uuid)
      from public, anon;
    grant execute on function private.appointment_scope_valid(uuid, uuid, uuid, uuid)
      to authenticated, service_role;

    drop policy if exists patients_authorized_insert on public.patients;
    create policy patients_authorized_insert
    on public.patients for insert to authenticated
    with check (
      (
        private.has_permission(organization_id, 'patient.create')
        and (
          primary_facility_id is null
          or exists (
            select 1
            from public.facilities f
            where f.id = primary_facility_id
              and f.organization_id = organization_id
          )
        )
      )
      or (
        auth_user_id = (select auth.uid())
        and created_by = (select auth.uid())
        and exists (
          select 1
          from public.organizations o
          where o.id = organization_id
            and o.status = 'active'
        )
        and (
          primary_facility_id is null
          or exists (
            select 1
            from public.facilities f
            where f.id = primary_facility_id
              and f.organization_id = organization_id
              and f.is_active
              and f.is_public
          )
        )
      )
    );

    drop policy if exists appointments_authorized_insert on public.appointments;
    create policy appointments_authorized_insert
    on public.appointments for insert to authenticated
    with check (
      private.appointment_scope_valid(
        organization_id,
        facility_id,
        department_id,
        service_id
      )
      and (
        private.has_permission(organization_id, 'appointment.create')
        or (
          status = 'requested'
          and created_by = (select auth.uid())
          and exists (
            select 1
            from public.patients p
            where p.id = patient_id
              and p.organization_id = organization_id
              and p.auth_user_id = (select auth.uid())
          )
        )
      )
    );
  ;
