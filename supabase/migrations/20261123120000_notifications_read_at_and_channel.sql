-- Add read tracking and delivery channel to notifications for the in-app inbox
alter table public.notifications
  add column read_at timestamptz,
  add column channel text not null default 'in_app';

create index notifications_unread_idx on public.notifications(recipient_email) where read_at is null;
