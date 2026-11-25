alter table public.lab_orders add column if not exists clinician_notified_at timestamptz;
alter table public.imaging_orders add column if not exists clinician_notified_at timestamptz;
