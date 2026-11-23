-- Hospica Settings module: organization-scoped configuration.
-- Typed columns only — no unvalidated JSONB for operational settings.

alter table public.organizations
  add column if not exists description text,
  add column if not exists address_line text,
  add column if not exists city text,
  add column if not exists district text,
  add column if not exists country_code text not null default 'UG',
  add column if not exists emergency_phone text,
  add column if not exists logo_path text;

create table if not exists public.organization_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,

  -- General / localization display preferences
  default_date_format text not null default 'd mmm yyyy'
    check (default_date_format in ('d mmm yyyy', 'yyyy-mm-dd', 'dd/mm/yyyy', 'mm/dd/yyyy')),
  default_time_format text not null default '24h'
    check (default_time_format in ('12h', '24h')),
  default_locale text not null default 'en-UG'
    check (char_length(default_locale) between 2 and 20),

  -- Online booking rules (enforced by booking.service / appointment.service)
  online_booking_enabled boolean not null default true,
  booking_min_advance_minutes integer not null default 0
    check (booking_min_advance_minutes between 0 and 10080),
  booking_max_advance_days integer not null default 30
    check (booking_max_advance_days between 1 and 365),
  patient_cancellation_enabled boolean not null default true,
  cancellation_cutoff_hours integer not null default 0
    check (cancellation_cutoff_hours between 0 and 168),

  -- Notification delivery toggles (consumed by notification.service)
  in_app_notifications_enabled boolean not null default true,
  email_notifications_enabled boolean not null default true,
  appointment_reminders_enabled boolean not null default false,
  reminder_hours_before integer not null default 24
    check (reminder_hours_before between 1 and 168),

  -- Branding (validated hex; applied as staff accent via CSS custom property)
  brand_color text not null default '#0d9488'
    check (brand_color ~ '^#[0-9a-fA-F]{6}$'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create trigger organization_settings_set_updated_at
  before update on public.organization_settings
  for each row execute function private.set_updated_at();

grant select, insert, update on public.organization_settings to authenticated;
grant all privileges on public.organization_settings to service_role;

alter table public.organization_settings enable row level security;

-- Read: org members, plus any authenticated user when the org is public
-- (patient portal users need booking rules to render slots).
create policy organization_settings_read
on public.organization_settings for select to authenticated
using (
  private.is_org_member(organization_id)
  or exists (
    select 1 from public.organizations o
    where o.id = organization_id and o.is_public and o.status = 'active'
  )
);

create policy organization_settings_insert
on public.organization_settings for insert to authenticated
with check (private.has_permission(organization_id, 'settings.manage'));

create policy organization_settings_update
on public.organization_settings for update to authenticated
using (private.has_permission(organization_id, 'settings.manage'))
with check (private.has_permission(organization_id, 'settings.manage'));

-- Organization logo storage (public bucket: logos are public branding assets).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'organization-logos',
  'organization-logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists organization_logos_staff_select on storage.objects;
drop policy if exists organization_logos_staff_insert on storage.objects;
drop policy if exists organization_logos_staff_update on storage.objects;
drop policy if exists organization_logos_staff_delete on storage.objects;

create policy organization_logos_staff_select
on storage.objects for select to authenticated
using (
  bucket_id = 'organization-logos'
  and exists (
    select 1 from public.staff_memberships sm
    where sm.organization_id::text = (storage.foldername(objects.name))[1]
      and sm.is_active
      and private.has_permission(sm.organization_id, 'settings.manage')
  )
);

create policy organization_logos_staff_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'organization-logos'
  and exists (
    select 1 from public.staff_memberships sm
    where sm.organization_id::text = (storage.foldername(objects.name))[1]
      and sm.is_active
      and private.has_permission(sm.organization_id, 'settings.manage')
  )
);

create policy organization_logos_staff_update
on storage.objects for update to authenticated
using (
  bucket_id = 'organization-logos'
  and exists (
    select 1 from public.staff_memberships sm
    where sm.organization_id::text = (storage.foldername(objects.name))[1]
      and sm.is_active
      and private.has_permission(sm.organization_id, 'settings.manage')
  )
);

create policy organization_logos_staff_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'organization-logos'
  and exists (
    select 1 from public.staff_memberships sm
    where sm.organization_id::text = (storage.foldername(objects.name))[1]
      and sm.is_active
      and private.has_permission(sm.organization_id, 'settings.manage')
  )
);
