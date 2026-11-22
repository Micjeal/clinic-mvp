-- Allow appointment.update staff to assign/reassign only the clinician field.
-- Other appointment fields remain immutable and the existing status graph remains unchanged.
create or replace function private.guard_appointment_update() returns trigger
language plpgsql security invoker set search_path='' as $function$
declare staff_can_update boolean;
begin
 staff_can_update := private.has_permission(old.organization_id,'appointment.update');
 if not staff_can_update and (new.organization_id is distinct from old.organization_id or new.facility_id is distinct from old.facility_id or new.department_id is distinct from old.department_id or new.service_id is distinct from old.service_id or new.patient_id is distinct from old.patient_id or new.clinician_user_id is distinct from old.clinician_user_id or new.scheduled_start is distinct from old.scheduled_start or new.scheduled_end is distinct from old.scheduled_end or new.reason is distinct from old.reason or new.created_by is distinct from old.created_by or new.appointment_type is distinct from old.appointment_type) then raise exception 'appointment fields are immutable after creation'; end if;
 if staff_can_update and (new.organization_id is distinct from old.organization_id or new.facility_id is distinct from old.facility_id or new.department_id is distinct from old.department_id or new.service_id is distinct from old.service_id or new.patient_id is distinct from old.patient_id or new.scheduled_start is distinct from old.scheduled_start or new.scheduled_end is distinct from old.scheduled_end or new.reason is distinct from old.reason or new.created_by is distinct from old.created_by or new.appointment_type is distinct from old.appointment_type) then raise exception 'appointment fields are immutable after creation'; end if;
 if not staff_can_update and (not exists(select 1 from public.patients p where p.id=old.patient_id and p.auth_user_id=(select auth.uid())) or old.status not in ('requested','scheduled','confirmed') or new.status <> 'cancelled') then raise exception 'patient may only cancel an eligible appointment'; end if;
 if not ((old.status='requested' and new.status in ('requested','scheduled','cancelled')) or (old.status='scheduled' and new.status in ('scheduled','confirmed','cancelled','no_show')) or (old.status='confirmed' and new.status in ('confirmed','checked_in','cancelled','no_show')) or (old.status='checked_in' and new.status in ('checked_in','in_progress')) or (old.status='in_progress' and new.status in ('in_progress','completed')) or new.status=old.status) then raise exception 'invalid appointment status transition'; end if;
 return new;
end;$function$;

;
