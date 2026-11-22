drop policy if exists patients_authorized_insert on public.patients;
create policy patients_authorized_insert on public.patients
for insert to authenticated
with check (
  (
    private.has_permission(organization_id, 'patient.create')
    and (primary_facility_id is null or exists (
      select 1 from public.facilities f
      where f.id = primary_facility_id and f.organization_id = patients.organization_id
    ))
  )
  or (
    auth_user_id = (select auth.uid())
    and created_by = (select auth.uid())
    and exists (select 1 from public.organizations o where o.id = patients.organization_id and o.status = 'active')
    and (primary_facility_id is null or exists (
      select 1 from public.facilities f
      where f.id = primary_facility_id
        and f.organization_id = patients.organization_id
        and f.is_active and f.is_public
    ))
  )
);

drop policy if exists appointments_authorized_insert on public.appointments;
create policy appointments_authorized_insert on public.appointments
for insert to authenticated
with check (
  private.appointment_scope_valid(organization_id, facility_id, department_id, service_id)
  and (
    private.has_permission(organization_id, 'appointment.create')
    or (
      status = 'requested'
      and created_by = (select auth.uid())
      and exists (
        select 1 from public.patients p
        where p.id = patient_id
          and p.organization_id = appointments.organization_id
          and p.auth_user_id = (select auth.uid())
      )
    )
  )
);

drop policy if exists departments_admin_insert on public.departments;
create policy departments_admin_insert on public.departments
for insert to authenticated
with check (
  private.has_permission(organization_id, 'department.manage')
  and exists (
    select 1 from public.facilities f
    where f.id = facility_id and f.organization_id = departments.organization_id
  )
);

drop policy if exists departments_admin_update on public.departments;
create policy departments_admin_update on public.departments
for update to authenticated
using (private.has_permission(organization_id, 'department.manage'))
with check (
  private.has_permission(organization_id, 'department.manage')
  and exists (
    select 1 from public.facilities f
    where f.id = facility_id and f.organization_id = departments.organization_id
  )
);

create unique index if not exists patients_auth_user_id_unique
on public.patients(auth_user_id)
where auth_user_id is not null;

create or replace function private.guard_appointment_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  staff_can_update boolean;
begin
  if new.organization_id is distinct from old.organization_id
     or new.facility_id is distinct from old.facility_id
     or new.department_id is distinct from old.department_id
     or new.service_id is distinct from old.service_id
     or new.patient_id is distinct from old.patient_id
     or new.clinician_user_id is distinct from old.clinician_user_id
     or new.scheduled_start is distinct from old.scheduled_start
     or new.scheduled_end is distinct from old.scheduled_end
     or new.reason is distinct from old.reason
     or new.created_by is distinct from old.created_by
     or new.appointment_type is distinct from old.appointment_type
  then
    raise exception 'appointment fields are immutable after creation';
  end if;

  staff_can_update := private.has_permission(old.organization_id, 'appointment.update');

  if not staff_can_update then
    if not exists (
      select 1 from public.patients p
      where p.id = old.patient_id and p.auth_user_id = (select auth.uid())
    ) or old.status not in ('requested','scheduled','confirmed')
       or new.status <> 'cancelled'
    then
      raise exception 'patient may only cancel an eligible appointment';
    end if;
  end if;

  if not (
    (old.status = 'requested' and new.status in ('scheduled','cancelled'))
    or (old.status = 'scheduled' and new.status in ('confirmed','cancelled','no_show'))
    or (old.status = 'confirmed' and new.status in ('checked_in','cancelled','no_show'))
    or (old.status = 'checked_in' and new.status = 'in_progress')
    or (old.status = 'in_progress' and new.status = 'completed')
  ) then
    raise exception 'invalid appointment status transition';
  end if;
  return new;
end;
$function$;

drop trigger if exists guard_appointment_update on public.appointments;
create trigger guard_appointment_update
before update on public.appointments
for each row execute function private.guard_appointment_update();;
