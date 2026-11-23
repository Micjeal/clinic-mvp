-- F-02 remediation: atomic appointment check-in.
-- All writes (encounter, queue entry, appointment status) happen in one
-- database transaction. Idempotent: repeat calls return the existing records.

create or replace function public.check_in_appointment(p_appointment_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_appointment public.appointments%rowtype;
  v_encounter_id uuid;
  v_queue_id uuid;
begin
  select * into v_appointment
  from public.appointments
  where id = p_appointment_id;

  if not found then
    raise exception 'Appointment not found.' using errcode = 'P0002';
  end if;

  if not private.has_permission(v_appointment.organization_id, 'reception.checkin') then
    raise exception 'You do not have permission to check in patients.' using errcode = '42501';
  end if;

  -- Idempotent return: an encounter already exists for this appointment.
  select e.id into v_encounter_id
  from public.encounters e
  where e.appointment_id = p_appointment_id
    and e.organization_id = v_appointment.organization_id
  limit 1;

  if v_encounter_id is not null then
    select q.id into v_queue_id
    from public.queue_entries q
    where q.encounter_id = v_encounter_id;
    return jsonb_build_object(
      'encounterId', v_encounter_id,
      'queueId', v_queue_id,
      'existing', true
    );
  end if;

  if v_appointment.status <> 'confirmed' then
    raise exception 'This appointment must be confirmed before check-in.' using errcode = 'P0001';
  end if;

  insert into public.encounters (
    organization_id, facility_id, department_id, service_id,
    patient_id, appointment_id, clinician_user_id,
    encounter_type, status, started_at, created_by
  ) values (
    v_appointment.organization_id, v_appointment.facility_id,
    v_appointment.department_id, v_appointment.service_id,
    v_appointment.patient_id, v_appointment.id,
    v_appointment.clinician_user_id,
    'outpatient', 'open', now(), (select auth.uid())
  )
  returning id into v_encounter_id;

  insert into public.queue_entries (
    organization_id, facility_id, department_id,
    encounter_id, status, priority, created_by
  ) values (
    v_appointment.organization_id, v_appointment.facility_id,
    v_appointment.department_id, v_encounter_id,
    'waiting_triage', 'routine', (select auth.uid())
  )
  returning id into v_queue_id;

  update public.appointments
  set status = 'checked_in'
  where id = v_appointment.id;

  return jsonb_build_object(
    'encounterId', v_encounter_id,
    'queueId', v_queue_id,
    'existing', false
  );
exception
  when unique_violation then
    -- A concurrent check-in won the race; return its records instead of failing.
    select e.id into v_encounter_id
    from public.encounters e
    where e.appointment_id = p_appointment_id
      and e.organization_id = v_appointment.organization_id
    limit 1;
    if v_encounter_id is not null then
      select q.id into v_queue_id
      from public.queue_entries q
      where q.encounter_id = v_encounter_id;
      return jsonb_build_object(
        'encounterId', v_encounter_id,
        'queueId', v_queue_id,
        'existing', true
      );
    end if;
    raise;
end;
$$;

revoke all on function public.check_in_appointment(uuid) from public, anon;
grant execute on function public.check_in_appointment(uuid) to authenticated;

-- F-03 remediation: separate operational queue management from clinical
-- completion. Clinician-stage transitions require the assigned clinician
-- (or an authorized supervisory override with a recorded reason).

insert into public.permissions(permission_key, description) values
  ('queue.clinical', 'Conduct and complete clinician queue stages'),
  ('queue.override', 'Override clinical queue completion rules')
on conflict (permission_key) do nothing;

insert into public.role_permissions(role_id, permission_key)
select r.id, p.permission_key
from public.roles r
join public.permissions p on p.permission_key = 'queue.clinical'
where r.role_key = 'doctor'
on conflict do nothing;

-- Organization admins may act as the assigned clinician when needed and hold
-- the supervisory override for encounters assigned to other clinicians.
insert into public.role_permissions(role_id, permission_key)
select r.id, p.permission_key
from public.roles r
join public.permissions p on p.permission_key in ('queue.clinical', 'queue.override')
where r.role_key = 'organization_admin'
on conflict do nothing;

alter table public.queue_entries
  add column if not exists consult_started_by uuid references public.profiles(id),
  add column if not exists consult_started_at timestamptz,
  add column if not exists consult_completed_by uuid references public.profiles(id),
  add column if not exists consult_completed_at timestamptz,
  add column if not exists completion_override_reason text;
