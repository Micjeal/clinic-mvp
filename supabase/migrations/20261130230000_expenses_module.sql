create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid references public.facilities(id) on delete set null,
  category text not null,
  description text not null,
  amount numeric(14,2) not null check (amount >= 0),
  currency_code text not null default 'UGX',
  expense_date date not null default current_date,
  payment_method text,
  reference text,
  status text not null default 'recorded' check (status in ('recorded','approved','paid','void')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.expenses enable row level security;
create policy expenses_read on public.expenses for select to authenticated using (private.has_permission(organization_id,'expenses.read'));
create policy expenses_write on public.expenses for all to authenticated using (private.has_permission(organization_id,'expenses.manage')) with check (private.has_permission(organization_id,'expenses.manage'));
insert into public.permissions(permission_key,description) values ('expenses.read','View facility expenses') on conflict do nothing;
insert into public.permissions(permission_key,description) values ('expenses.manage','Record and approve expenses') on conflict do nothing;
insert into public.role_permissions(role_id,permission_key)
select r.id,'expenses.read' from public.roles r where r.role_key in ('organization_admin','cashier','inventory_manager') on conflict do nothing;
insert into public.role_permissions(role_id,permission_key)
select r.id,'expenses.manage' from public.roles r where r.role_key in ('organization_admin') on conflict do nothing;
