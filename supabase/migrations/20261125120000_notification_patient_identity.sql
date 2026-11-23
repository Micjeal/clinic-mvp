-- F-01 remediation: key patient notifications to patients.id instead of the
-- mutable patients.email contact field. recipient_email is kept as contact
-- information only and is no longer an authorization identifier.

alter table public.notifications
  add column if not exists recipient_patient_id uuid references public.patients(id) on delete set null;

alter table public.notifications
  alter column recipient_email drop not null;

create index if not exists notifications_recipient_patient_idx
  on public.notifications(recipient_patient_id)
  where recipient_patient_id is not null;

create index if not exists notifications_patient_unread_idx
  on public.notifications(recipient_patient_id)
  where recipient_patient_id is not null and read_at is null;

-- Backfill only reliably resolvable recipients; ambiguous rows are left NULL
-- rather than guessing an owner.

-- 1) Appointment notifications carry metadata.appointment_id -> appointments.patient_id
update public.notifications n
set recipient_patient_id = a.patient_id
from public.appointments a
where n.recipient_patient_id is null
  and a.id::text = n.metadata->>'appointment_id'
  and a.patient_id is not null;

-- 2) Remaining rows: email match only when exactly one patient has that email
update public.notifications n
set recipient_patient_id = p.id
from public.patients p
where n.recipient_patient_id is null
  and p.email is not null
  and lower(p.email) = lower(n.recipient_email)
  and (
    select count(*)
    from public.patients p2
    where p2.email is not null and lower(p2.email) = lower(n.recipient_email)
  ) = 1;

-- Tighten the authenticated read policy to the verified patient identity.
-- The auth-email clause is retained so notifications addressed to the login
-- email remain visible even if the patient backfill could not resolve them;
-- auth.users.email cannot be changed silently like patients.email can.
drop policy if exists notifications_user_select on public.notifications;

create policy notifications_user_select on public.notifications
  for select to authenticated
  using (
    recipient_patient_id in (
      select p.id from public.patients p where p.auth_user_id = (select auth.uid())
    )
    or recipient_email = (select email from auth.users where id = (select auth.uid()))
  );
