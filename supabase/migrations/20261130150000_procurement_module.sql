-- Procurement: suppliers and purchase orders

insert into public.permissions(permission_key, description) values
  ('procurement.read','View suppliers and purchase orders'),
  ('procurement.manage','Create and manage purchase orders'),
  ('procurement.approve','Approve purchase orders')
on conflict (permission_key) do nothing;

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  payment_terms_days integer not null default 30 check (payment_terms_days >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid not null references public.facilities(id),
  supplier_id uuid not null references public.suppliers(id),
  po_number text not null,
  status text not null default 'draft' check (status in ('draft','submitted','approved','partially_received','received','cancelled')),
  expected_at date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, po_number)
);

create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  description text not null,
  quantity_ordered numeric(14,3) not null check (quantity_ordered > 0),
  quantity_received numeric(14,3) not null default 0 check (quantity_received >= 0),
  unit_cost numeric(14,2) not null default 0 check (unit_cost >= 0),
  created_at timestamptz not null default now()
);

create index purchase_orders_org_idx on public.purchase_orders(organization_id, status, created_at desc);

alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;

create policy suppliers_read on public.suppliers for select to authenticated
  using (private.has_permission(organization_id,'procurement.read') or private.has_permission(organization_id,'inventory.read'));
create policy suppliers_insert on public.suppliers for insert to authenticated
  with check (private.has_permission(organization_id,'procurement.manage'));
create policy suppliers_update on public.suppliers for update to authenticated
  using (private.has_permission(organization_id,'procurement.manage')) with check (private.has_permission(organization_id,'procurement.manage'));

create policy purchase_orders_read on public.purchase_orders for select to authenticated
  using (private.has_permission(organization_id,'procurement.read') or private.has_permission(organization_id,'inventory.read'));
create policy purchase_orders_insert on public.purchase_orders for insert to authenticated
  with check (private.has_permission(organization_id,'procurement.manage'));
create policy purchase_orders_update on public.purchase_orders for update to authenticated
  using (private.has_permission(organization_id,'procurement.manage') or private.has_permission(organization_id,'procurement.approve'))
  with check (private.has_permission(organization_id,'procurement.manage') or private.has_permission(organization_id,'procurement.approve'));

create policy purchase_order_items_read on public.purchase_order_items for select to authenticated
  using (exists (select 1 from public.purchase_orders po where po.id = purchase_order_id and (private.has_permission(po.organization_id,'procurement.read') or private.has_permission(po.organization_id,'inventory.read'))));
create policy purchase_order_items_insert on public.purchase_order_items for insert to authenticated
  with check (exists (select 1 from public.purchase_orders po where po.id = purchase_order_id and private.has_permission(po.organization_id,'procurement.manage')));
create policy purchase_order_items_update on public.purchase_order_items for update to authenticated
  using (exists (select 1 from public.purchase_orders po where po.id = purchase_order_id and (private.has_permission(po.organization_id,'procurement.manage') or private.has_permission(po.organization_id,'procurement.approve'))))
  with check (exists (select 1 from public.purchase_orders po where po.id = purchase_order_id and (private.has_permission(po.organization_id,'procurement.manage') or private.has_permission(po.organization_id,'procurement.approve'))));

insert into public.role_permissions(role_id, permission_key)
select r.id, x.permission_key from public.roles r
join (values ('procurement.read'),('procurement.manage'),('procurement.approve')) as x(permission_key) on true
where r.role_key = 'organization_admin' on conflict do nothing;

insert into public.role_permissions(role_id, permission_key)
select r.id, x.permission_key from public.roles r
join (values ('procurement.read'),('procurement.manage')) as x(permission_key) on true
where r.role_key = 'inventory_manager' on conflict do nothing;

insert into public.role_permissions(role_id, permission_key)
select r.id, 'procurement.read' from public.roles r
where r.role_key in ('cashier','receptionist','doctor','nurse') on conflict do nothing;
