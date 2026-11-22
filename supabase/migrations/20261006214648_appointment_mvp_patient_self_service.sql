
    create sequence if not exists public.patient_number_seq start 100001;

    alter table public.patients
      alter column patient_number
      set default (
        'PT-' ||
        to_char(current_date, 'YYYY') ||
        '-' ||
        lpad(nextval('public.patient_number_seq')::text, 6, '0')
      );

    grant usage, select on sequence public.patient_number_seq to authenticated, service_role;

    create or replace function private.handle_new_auth_user()
    returns trigger
    language plpgsql
    security definer
    set search_path = ''
    as $$
    begin
      insert into public.profiles (id, full_name)
      values (
        new.id,
        nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
      )
      on conflict (id) do nothing;
      return new;
    end;
    $$;

    revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

    drop trigger if exists on_auth_user_created_create_profile on auth.users;
    create trigger on_auth_user_created_create_profile
      after insert on auth.users
      for each row execute function private.handle_new_auth_user();

    drop policy if exists patients_staff_insert on public.patients;

    create policy patients_authorized_insert
    on public.patients for insert to authenticated
    with check (
      private.has_permission(organization_id, 'patient.create')
      or (
        auth_user_id = (select auth.uid())
        and created_by = (select auth.uid())
        and exists (
          select 1
          from public.organizations o
          where o.id = organization_id
            and o.status = 'active'
        )
      )
    );

    create or replace function private.guard_patient_appointment_update()
    returns trigger
    language plpgsql
    security invoker
    set search_path = ''
    as $$
    declare
      caller uuid := (select auth.uid());
      owns_appointment boolean;
    begin
      if caller is null then
        raise exception 'Authentication required';
      end if;

      if private.has_permission(old.organization_id, 'appointment.update') then
        return new;
      end if;

      select exists (
        select 1
        from public.patients p
        where p.id = old.patient_id
          and p.auth_user_id = caller
      ) into owns_appointment;

      if not owns_appointment then
        raise exception 'Appointment update is not permitted';
      end if;

      if old.status not in ('requested','scheduled','confirmed') or new.status <> 'cancelled' then
        raise exception 'Patients may only cancel an active appointment';
      end if;

      if new.organization_id is distinct from old.organization_id
         or new.facility_id is distinct from old.facility_id
         or new.department_id is distinct from old.department_id
         or new.patient_id is distinct from old.patient_id
         or new.clinician_user_id is distinct from old.clinician_user_id
         or new.appointment_type is distinct from old.appointment_type
         or new.scheduled_start is distinct from old.scheduled_start
         or new.scheduled_end is distinct from old.scheduled_end
         or new.reason is distinct from old.reason
         or new.notes is distinct from old.notes
         or new.created_by is distinct from old.created_by
         or new.created_at is distinct from old.created_at
         or new.service_id is distinct from old.service_id then
        raise exception 'Patients may not modify appointment details; cancel and submit a new request';
      end if;

      return new;
    end;
    $$;

    revoke all on function private.guard_patient_appointment_update() from public, anon, authenticated;

    drop trigger if exists guard_patient_appointment_update on public.appointments;
    create trigger guard_patient_appointment_update
      before update on public.appointments
      for each row execute function private.guard_patient_appointment_update();

    drop policy if exists appointments_staff_update on public.appointments;

    create policy appointments_authorized_update
    on public.appointments for update to authenticated
    using (
      private.has_permission(organization_id, 'appointment.update')
      or exists (
        select 1
        from public.patients p
        where p.id = patient_id
          and p.auth_user_id = (select auth.uid())
      )
    )
    with check (
      private.has_permission(organization_id, 'appointment.update')
      or (
        status = 'cancelled'
        and exists (
          select 1
          from public.patients p
          where p.id = patient_id
            and p.auth_user_id = (select auth.uid())
        )
      )
    );
  ;
