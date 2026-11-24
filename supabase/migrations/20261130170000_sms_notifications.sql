-- SMS notification channel
alter table public.organization_settings
  add column if not exists sms_notifications_enabled boolean not null default true;

alter table public.notifications
  add column if not exists recipient_phone text;
