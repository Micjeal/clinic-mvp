-- Create notifications table for appointment and auth notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  recipient_email text not null,
  recipient_name text,
  subject text not null,
  message text not null,
  metadata jsonb default '{}',
  status text not null default 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.notifications enable row level security;

-- Service role can manage all notifications
create policy notifications_service_role_all on public.notifications
  for all to service_role using (true) with check (true);

-- Authenticated users can view their own notifications
create policy notifications_user_select on public.notifications
  for select to authenticated
  using (recipient_email = (select email from auth.users where id = auth.uid()));

-- Create updated_at trigger
create trigger notifications_updated_at
  before update on public.notifications
  for each row
  execute function private.set_updated_at();

-- Create index on recipient_email for performance
create index notifications_recipient_email_idx on public.notifications(recipient_email);

-- Create index on status for filtering
create index notifications_status_idx on public.notifications(status);

-- Create index on created_at for sorting
create index notifications_created_at_idx on public.notifications(created_at desc);
