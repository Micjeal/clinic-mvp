-- Fill role permission gaps so each staff role can work their part of the
-- patient journey: receptionist checks in, nurse triages, doctor orders,
-- lab tech results, pharmacist dispenses, cashier bills.

insert into public.role_permissions (role_id, permission_key)
select r.id, x.permission_key
from public.roles r
join (values
  ('reception.checkin'),('queue.read'),('queue.manage'),
  ('patient.read'),('patient.create'),('patient.update'),
  ('appointment.read'),('appointment.create'),('appointment.update'),
  ('encounter.read')
) as x(permission_key) on true
where r.role_key = 'receptionist'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, x.permission_key
from public.roles r
join (values
  ('patient.read'),('appointment.read'),
  ('encounter.read'),('encounter.update'),('triage.write'),
  ('queue.read'),('queue.manage'),
  ('clinical_note.write'),('lab.read'),('radiology.read')
) as x(permission_key) on true
where r.role_key = 'nurse'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, x.permission_key
from public.roles r
join (values
  ('patient.read'),('appointment.read'),
  ('encounter.read'),('encounter.create'),('encounter.update'),
  ('queue.read'),('queue.clinical'),('triage.write'),
  ('clinical_note.write'),('diagnosis.write'),
  ('lab.read'),('lab.order'),
  ('radiology.read'),('radiology.order'),
  ('prescription.read'),('prescription.write'),('pharmacy.read')
) as x(permission_key) on true
where r.role_key = 'doctor'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, x.permission_key
from public.roles r
join (values
  ('patient.read'),('encounter.read'),('lab.read'),
  ('lab.result.write'),('lab.result.approve'),
  ('queue.read')
) as x(permission_key) on true
where r.role_key = 'lab_technician'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, x.permission_key
from public.roles r
join (values
  ('patient.read'),('pharmacy.read'),('pharmacy.dispense'),
  ('prescription.read'),('inventory.read'),('queue.read')
) as x(permission_key) on true
where r.role_key = 'pharmacist'
on conflict do nothing;
