-- The update guard allowed any profiles row as clinician_user_id. Validate the
-- assignment at the database boundary: active doctor in the same organization who
-- is assigned to the appointment's department and (when present) service/facility.
-- Also drop the redundant second update guard so there is one source of truth.

create or replace function private.is_assignable_clinician(
  target_organization_id uuid,
  target_facility_id uuid,
  target_department_id uuid,
  target_service_id uuid,
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.staff_memberships m
    join public.roles r on r.id = m.role_id and r.role_key = 'doctor'
    join public.clinician_profiles cp on cp.membership_id = m.id
    join public.staff_department_assignments sda
      on sda.membership_id = m.id
     and sda.department_id = target_department_id
    where m.user_id = target_user_id
      and m.organization_id = target_organization_id
      and m.is_active
      and (
        (target_service_id is null and m.primary_facility_id = target_facility_id)
        or (
          target_service_id is not null
          and exists (
            select 1
            from public.staff_service_assignments ssa
            join public.services s on s.id = ssa.service_id
            where ssa.membership_id = m.id
              and ssa.service_id = target_service_id
              and ssa.is_active
              and coalesce(s.facility_id, m.primary_facility_id) = target_facility_id
          )
        )
      )
  );
$function$;

create or replace function private.guard_appointment_clinician()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if new.clinician_user_id is not null
    and (tg_op = 'INSERT' or new.clinician_user_id is distinct from old.clinician_user_id)
    and not private.is_assignable_clinician(
      new.organization_id,
      new.facility_id,
      new.department_id,
      new.service_id,
      new.clinician_user_id
    ) then
    raise exception 'Assigned clinician is not an active doctor for this appointment.';
  end if;
  return new;
end;
$function$;

drop trigger if exists appointments_guard_clinician_assignment on public.appointments;
create trigger appointments_guard_clinician_assignment
before insert or update on public.appointments
for each row execute function private.guard_appointment_clinician();

drop trigger if exists guard_patient_appointment_update on public.appointments;
drop function if exists private.guard_patient_appointment_update();

revoke all on function private.is_assignable_clinician(uuid, uuid, uuid, uuid, uuid) from public;
grant execute on function private.is_assignable_clinician(uuid, uuid, uuid, uuid, uuid) to authenticated, service_role;
