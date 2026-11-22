
insert into public.permissions(permission_key, description) values
('service.manage','Manage service catalogue and pricing'),
('prescription.read','Read prescriptions'),
('prescription.write','Create and update prescriptions')
on conflict do nothing;

insert into public.role_permissions(role_id, permission_key)
select r.id, p.permission_key
from public.roles r
join public.permissions p on p.permission_key in ('service.manage','prescription.read','prescription.write')
where r.role_key = 'organization_admin'
on conflict do nothing;

insert into public.role_permissions(role_id, permission_key)
select r.id, p.permission_key
from public.roles r
join public.permissions p on p.permission_key in ('prescription.read','prescription.write')
where r.role_key = 'doctor'
on conflict do nothing;

insert into public.role_permissions(role_id, permission_key)
select r.id, p.permission_key
from public.roles r
join public.permissions p on p.permission_key = 'prescription.read'
where r.role_key in ('nurse','pharmacist')
on conflict do nothing;

create table public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid references public.facilities(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  code text not null,
  name text not null,
  description text,
  service_type text not null default 'clinical',
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  base_price numeric(14,2) not null default 0 check (base_price >= 0),
  currency_code text not null default 'UGX',
  is_active boolean not null default true,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

alter table public.appointments
  add column service_id uuid references public.services(id) on delete set null;

create table public.lab_tests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  code text not null,
  name text not null,
  description text,
  specimen_type text,
  default_unit text,
  reference_range_text text,
  price numeric(14,2) not null default 0 check (price >= 0),
  currency_code text not null default 'UGX',
  is_active boolean not null default true,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.lab_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid not null references public.facilities(id),
  department_id uuid not null references public.departments(id),
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  patient_id uuid not null references public.patients(id),
  ordered_by uuid not null references public.profiles(id),
  priority text not null default 'routine'
    check (priority in ('routine','urgent','stat')),
  status text not null default 'ordered'
    check (status in ('ordered','sample_collected','processing','completed','cancelled')),
  clinical_notes text,
  ordered_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lab_order_items (
  id uuid primary key default gen_random_uuid(),
  lab_order_id uuid not null references public.lab_orders(id) on delete cascade,
  lab_test_id uuid not null references public.lab_tests(id),
  status text not null default 'ordered'
    check (status in ('ordered','sample_collected','processing','completed','cancelled')),
  specimen_id text,
  collected_by uuid references public.profiles(id) on delete set null,
  collected_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (lab_order_id, lab_test_id)
);

create table public.lab_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lab_order_item_id uuid not null unique references public.lab_order_items(id) on delete cascade,
  patient_id uuid not null references public.patients(id),
  result_value text,
  unit text,
  reference_range text,
  abnormal_flag text check (abnormal_flag in ('normal','low','high','critical','abnormal') or abnormal_flag is null),
  result_text text,
  resulted_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  resulted_at timestamptz,
  approved_at timestamptz,
  patient_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.medications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  generic_name text not null,
  brand_name text,
  dosage_form text,
  strength text,
  unit text not null default 'unit',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid not null references public.facilities(id),
  department_id uuid not null references public.departments(id),
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  patient_id uuid not null references public.patients(id),
  prescriber_user_id uuid not null references public.profiles(id),
  status text not null default 'active'
    check (status in ('draft','active','partially_dispensed','dispensed','cancelled','expired')),
  notes text,
  prescribed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prescription_items (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions(id) on delete cascade,
  medication_id uuid references public.medications(id),
  medication_name text not null,
  dose text,
  route text,
  frequency text,
  duration_days integer check (duration_days is null or duration_days > 0),
  quantity numeric(12,2) check (quantity is null or quantity > 0),
  instructions text,
  status text not null default 'active'
    check (status in ('active','partially_dispensed','dispensed','cancelled')),
  created_at timestamptz not null default now()
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid not null references public.facilities(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  medication_id uuid references public.medications(id) on delete set null,
  sku text not null,
  item_name text not null,
  unit text not null default 'unit',
  on_hand_quantity numeric(14,3) not null default 0,
  reorder_level numeric(14,3) not null default 0,
  cost_price numeric(14,2) not null default 0 check (cost_price >= 0),
  selling_price numeric(14,2) not null default 0 check (selling_price >= 0),
  batch_tracking boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (facility_id, sku)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid not null references public.facilities(id),
  inventory_item_id uuid not null references public.inventory_items(id),
  movement_type text not null
    check (movement_type in ('opening','purchase','adjustment_in','adjustment_out','dispense','return','transfer_in','transfer_out','waste')),
  quantity numeric(14,3) not null check (quantity > 0),
  batch_number text,
  expiry_date date,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid not null references public.facilities(id),
  patient_id uuid not null references public.patients(id),
  encounter_id uuid references public.encounters(id) on delete set null,
  invoice_number text not null,
  status text not null default 'draft'
    check (status in ('draft','issued','partially_paid','paid','void','refunded')),
  currency_code text not null default 'UGX',
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  discount_total numeric(14,2) not null default 0 check (discount_total >= 0),
  tax_total numeric(14,2) not null default 0 check (tax_total >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  balance numeric(14,2) not null default 0 check (balance >= 0),
  issued_at timestamptz,
  due_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, invoice_number)
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  medication_id uuid references public.medications(id) on delete set null,
  description text not null,
  quantity numeric(12,3) not null default 1 check (quantity > 0),
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0),
  line_total numeric(14,2) not null default 0 check (line_total >= 0),
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid not null references public.facilities(id),
  invoice_id uuid not null references public.invoices(id),
  patient_id uuid not null references public.patients(id),
  amount numeric(14,2) not null check (amount > 0),
  currency_code text not null default 'UGX',
  payment_method text not null
    check (payment_method in ('cash','card','mobile_money','bank_transfer','insurance','other')),
  provider text,
  external_reference text,
  status text not null default 'completed'
    check (status in ('pending','completed','failed','refunded','void')),
  received_by uuid references public.profiles(id) on delete set null,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index services_org_idx on public.services(organization_id);
create index services_facility_idx on public.services(facility_id);
create index services_department_idx on public.services(department_id);
create index appointments_service_idx on public.appointments(service_id);

create index lab_tests_org_idx on public.lab_tests(organization_id);
create index lab_tests_department_idx on public.lab_tests(department_id);
create index lab_orders_org_status_idx on public.lab_orders(organization_id, status, ordered_at desc);
create index lab_orders_facility_idx on public.lab_orders(facility_id);
create index lab_orders_department_idx on public.lab_orders(department_id);
create index lab_orders_encounter_idx on public.lab_orders(encounter_id);
create index lab_orders_patient_idx on public.lab_orders(patient_id, ordered_at desc);
create index lab_orders_ordered_by_idx on public.lab_orders(ordered_by);
create index lab_order_items_test_idx on public.lab_order_items(lab_test_id);
create index lab_order_items_collected_by_idx on public.lab_order_items(collected_by);
create index lab_results_org_idx on public.lab_results(organization_id);
create index lab_results_patient_idx on public.lab_results(patient_id, created_at desc);
create index lab_results_resulted_by_idx on public.lab_results(resulted_by);
create index lab_results_approved_by_idx on public.lab_results(approved_by);

create index medications_org_idx on public.medications(organization_id);
create index prescriptions_org_status_idx on public.prescriptions(organization_id, status, prescribed_at desc);
create index prescriptions_facility_idx on public.prescriptions(facility_id);
create index prescriptions_department_idx on public.prescriptions(department_id);
create index prescriptions_encounter_idx on public.prescriptions(encounter_id);
create index prescriptions_patient_idx on public.prescriptions(patient_id, prescribed_at desc);
create index prescriptions_prescriber_idx on public.prescriptions(prescriber_user_id);
create index prescription_items_medication_idx on public.prescription_items(medication_id);

create index inventory_items_org_idx on public.inventory_items(organization_id);
create index inventory_items_department_idx on public.inventory_items(department_id);
create index inventory_items_medication_idx on public.inventory_items(medication_id);
create index stock_movements_org_created_idx on public.stock_movements(organization_id, created_at desc);
create index stock_movements_facility_idx on public.stock_movements(facility_id);
create index stock_movements_item_idx on public.stock_movements(inventory_item_id, created_at desc);
create index stock_movements_created_by_idx on public.stock_movements(created_by);

create index invoices_org_status_idx on public.invoices(organization_id, status, created_at desc);
create index invoices_facility_idx on public.invoices(facility_id);
create index invoices_patient_idx on public.invoices(patient_id, created_at desc);
create index invoices_encounter_idx on public.invoices(encounter_id);
create index invoices_created_by_idx on public.invoices(created_by);
create index invoice_items_service_idx on public.invoice_items(service_id);
create index invoice_items_medication_idx on public.invoice_items(medication_id);
create index payments_org_paid_idx on public.payments(organization_id, paid_at desc);
create index payments_facility_idx on public.payments(facility_id);
create index payments_invoice_idx on public.payments(invoice_id);
create index payments_patient_idx on public.payments(patient_id, paid_at desc);
create index payments_received_by_idx on public.payments(received_by);
create index audit_logs_org_created_idx on public.audit_logs(organization_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs(actor_user_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);

create trigger services_set_updated_at before update on public.services
for each row execute function private.set_updated_at();
create trigger lab_tests_set_updated_at before update on public.lab_tests
for each row execute function private.set_updated_at();
create trigger lab_orders_set_updated_at before update on public.lab_orders
for each row execute function private.set_updated_at();
create trigger lab_results_set_updated_at before update on public.lab_results
for each row execute function private.set_updated_at();
create trigger medications_set_updated_at before update on public.medications
for each row execute function private.set_updated_at();
create trigger prescriptions_set_updated_at before update on public.prescriptions
for each row execute function private.set_updated_at();
create trigger inventory_items_set_updated_at before update on public.inventory_items
for each row execute function private.set_updated_at();
create trigger invoices_set_updated_at before update on public.invoices
for each row execute function private.set_updated_at();

alter table public.services enable row level security;
alter table public.lab_tests enable row level security;
alter table public.lab_orders enable row level security;
alter table public.lab_order_items enable row level security;
alter table public.lab_results enable row level security;
alter table public.medications enable row level security;
alter table public.prescriptions enable row level security;
alter table public.prescription_items enable row level security;
alter table public.inventory_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;

grant select on public.services, public.lab_tests to anon;

grant select, insert, update on public.services, public.lab_tests,
  public.lab_orders, public.lab_order_items, public.lab_results,
  public.medications, public.prescriptions, public.prescription_items,
  public.inventory_items, public.invoices, public.invoice_items, public.payments
to authenticated;

grant select, insert on public.stock_movements to authenticated;
grant select on public.audit_logs to authenticated;

grant all privileges on public.services, public.lab_tests, public.lab_orders,
  public.lab_order_items, public.lab_results, public.medications,
  public.prescriptions, public.prescription_items, public.inventory_items,
  public.stock_movements, public.invoices, public.invoice_items,
  public.payments, public.audit_logs
to service_role;

create policy services_public_read
on public.services for select to anon
using (is_public and is_active);

create policy services_member_read
on public.services for select to authenticated
using (private.is_org_member(organization_id));

create policy services_manage_insert
on public.services for insert to authenticated
with check (private.has_permission(organization_id, 'service.manage'));

create policy services_manage_update
on public.services for update to authenticated
using (private.has_permission(organization_id, 'service.manage'))
with check (private.has_permission(organization_id, 'service.manage'));

create policy lab_tests_public_read
on public.lab_tests for select to anon
using (is_public and is_active);

create policy lab_tests_member_read
on public.lab_tests for select to authenticated
using (private.is_org_member(organization_id));

create policy lab_tests_manage_insert
on public.lab_tests for insert to authenticated
with check (
  private.has_permission(organization_id, 'department.manage')
  or private.has_permission(organization_id, 'lab.result.approve')
);

create policy lab_tests_manage_update
on public.lab_tests for update to authenticated
using (
  private.has_permission(organization_id, 'department.manage')
  or private.has_permission(organization_id, 'lab.result.approve')
)
with check (
  private.has_permission(organization_id, 'department.manage')
  or private.has_permission(organization_id, 'lab.result.approve')
);

create policy lab_orders_authorized_read
on public.lab_orders for select to authenticated
using (
  private.has_permission(organization_id, 'lab.read')
  or private.has_permission(organization_id, 'encounter.read')
  or exists (
    select 1 from public.patients p
    where p.id = patient_id and p.auth_user_id = (select auth.uid())
  )
);

create policy lab_orders_authorized_insert
on public.lab_orders for insert to authenticated
with check (
  private.has_permission(organization_id, 'lab.order')
  and ordered_by = (select auth.uid())
);

create policy lab_orders_authorized_update
on public.lab_orders for update to authenticated
using (
  private.has_permission(organization_id, 'lab.order')
  or private.has_permission(organization_id, 'lab.result.write')
)
with check (
  private.has_permission(organization_id, 'lab.order')
  or private.has_permission(organization_id, 'lab.result.write')
);

create policy lab_order_items_authorized_read
on public.lab_order_items for select to authenticated
using (
  exists (
    select 1 from public.lab_orders lo
    where lo.id = lab_order_id
  )
);

create policy lab_order_items_authorized_insert
on public.lab_order_items for insert to authenticated
with check (
  exists (
    select 1 from public.lab_orders lo
    where lo.id = lab_order_id
      and private.has_permission(lo.organization_id, 'lab.order')
  )
);

create policy lab_order_items_authorized_update
on public.lab_order_items for update to authenticated
using (
  exists (
    select 1 from public.lab_orders lo
    where lo.id = lab_order_id
      and (
        private.has_permission(lo.organization_id, 'lab.order')
        or private.has_permission(lo.organization_id, 'lab.result.write')
      )
  )
)
with check (
  exists (
    select 1 from public.lab_orders lo
    where lo.id = lab_order_id
      and (
        private.has_permission(lo.organization_id, 'lab.order')
        or private.has_permission(lo.organization_id, 'lab.result.write')
      )
  )
);

create policy lab_results_authorized_read
on public.lab_results for select to authenticated
using (
  private.has_permission(organization_id, 'lab.read')
  or private.has_permission(organization_id, 'encounter.read')
  or (
    patient_visible
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.auth_user_id = (select auth.uid())
    )
  )
);

create policy lab_results_authorized_insert
on public.lab_results for insert to authenticated
with check (private.has_permission(organization_id, 'lab.result.write'));

create policy lab_results_authorized_update
on public.lab_results for update to authenticated
using (
  private.has_permission(organization_id, 'lab.result.write')
  or private.has_permission(organization_id, 'lab.result.approve')
)
with check (
  private.has_permission(organization_id, 'lab.result.write')
  or private.has_permission(organization_id, 'lab.result.approve')
);

create policy medications_member_read
on public.medications for select to authenticated
using (private.is_org_member(organization_id));

create policy medications_manage_insert
on public.medications for insert to authenticated
with check (
  private.has_permission(organization_id, 'inventory.adjust')
  or private.has_permission(organization_id, 'pharmacy.dispense')
);

create policy medications_manage_update
on public.medications for update to authenticated
using (
  private.has_permission(organization_id, 'inventory.adjust')
  or private.has_permission(organization_id, 'pharmacy.dispense')
)
with check (
  private.has_permission(organization_id, 'inventory.adjust')
  or private.has_permission(organization_id, 'pharmacy.dispense')
);

create policy prescriptions_authorized_read
on public.prescriptions for select to authenticated
using (
  private.has_permission(organization_id, 'prescription.read')
  or private.has_permission(organization_id, 'pharmacy.read')
  or private.has_permission(organization_id, 'encounter.read')
  or exists (
    select 1 from public.patients p
    where p.id = patient_id and p.auth_user_id = (select auth.uid())
  )
);

create policy prescriptions_authorized_insert
on public.prescriptions for insert to authenticated
with check (
  private.has_permission(organization_id, 'prescription.write')
  and prescriber_user_id = (select auth.uid())
);

create policy prescriptions_authorized_update
on public.prescriptions for update to authenticated
using (
  private.has_permission(organization_id, 'prescription.write')
  or private.has_permission(organization_id, 'pharmacy.dispense')
)
with check (
  private.has_permission(organization_id, 'prescription.write')
  or private.has_permission(organization_id, 'pharmacy.dispense')
);

create policy prescription_items_authorized_read
on public.prescription_items for select to authenticated
using (
  exists (
    select 1 from public.prescriptions p
    where p.id = prescription_id
  )
);

create policy prescription_items_authorized_insert
on public.prescription_items for insert to authenticated
with check (
  exists (
    select 1 from public.prescriptions p
    where p.id = prescription_id
      and private.has_permission(p.organization_id, 'prescription.write')
  )
);

create policy prescription_items_authorized_update
on public.prescription_items for update to authenticated
using (
  exists (
    select 1 from public.prescriptions p
    where p.id = prescription_id
      and (
        private.has_permission(p.organization_id, 'prescription.write')
        or private.has_permission(p.organization_id, 'pharmacy.dispense')
      )
  )
)
with check (
  exists (
    select 1 from public.prescriptions p
    where p.id = prescription_id
      and (
        private.has_permission(p.organization_id, 'prescription.write')
        or private.has_permission(p.organization_id, 'pharmacy.dispense')
      )
  )
);

create policy inventory_items_authorized_read
on public.inventory_items for select to authenticated
using (
  private.has_permission(organization_id, 'inventory.read')
  or private.has_permission(organization_id, 'pharmacy.read')
);

create policy inventory_items_authorized_insert
on public.inventory_items for insert to authenticated
with check (private.has_permission(organization_id, 'inventory.adjust'));

create policy inventory_items_authorized_update
on public.inventory_items for update to authenticated
using (private.has_permission(organization_id, 'inventory.adjust'))
with check (private.has_permission(organization_id, 'inventory.adjust'));

create policy stock_movements_authorized_read
on public.stock_movements for select to authenticated
using (
  private.has_permission(organization_id, 'inventory.read')
  or private.has_permission(organization_id, 'pharmacy.read')
);

create policy stock_movements_authorized_insert
on public.stock_movements for insert to authenticated
with check (
  private.has_permission(organization_id, 'inventory.adjust')
  or (
    movement_type = 'dispense'
    and private.has_permission(organization_id, 'pharmacy.dispense')
  )
);

create policy invoices_authorized_read
on public.invoices for select to authenticated
using (
  private.has_permission(organization_id, 'billing.read')
  or exists (
    select 1 from public.patients p
    where p.id = patient_id and p.auth_user_id = (select auth.uid())
  )
);

create policy invoices_authorized_insert
on public.invoices for insert to authenticated
with check (private.has_permission(organization_id, 'billing.invoice.create'));

create policy invoices_authorized_update
on public.invoices for update to authenticated
using (private.has_permission(organization_id, 'billing.invoice.create'))
with check (private.has_permission(organization_id, 'billing.invoice.create'));

create policy invoice_items_authorized_read
on public.invoice_items for select to authenticated
using (
  exists (
    select 1 from public.invoices i
    where i.id = invoice_id
  )
);

create policy invoice_items_authorized_insert
on public.invoice_items for insert to authenticated
with check (
  exists (
    select 1 from public.invoices i
    where i.id = invoice_id
      and private.has_permission(i.organization_id, 'billing.invoice.create')
  )
);

create policy invoice_items_authorized_update
on public.invoice_items for update to authenticated
using (
  exists (
    select 1 from public.invoices i
    where i.id = invoice_id
      and private.has_permission(i.organization_id, 'billing.invoice.create')
  )
)
with check (
  exists (
    select 1 from public.invoices i
    where i.id = invoice_id
      and private.has_permission(i.organization_id, 'billing.invoice.create')
  )
);

create policy payments_authorized_read
on public.payments for select to authenticated
using (
  private.has_permission(organization_id, 'billing.read')
  or exists (
    select 1 from public.patients p
    where p.id = patient_id and p.auth_user_id = (select auth.uid())
  )
);

create policy payments_authorized_insert
on public.payments for insert to authenticated
with check (private.has_permission(organization_id, 'billing.payment.create'));

create policy payments_authorized_update
on public.payments for update to authenticated
using (
  private.has_permission(organization_id, 'billing.payment.create')
  or private.has_permission(organization_id, 'billing.refund')
)
with check (
  private.has_permission(organization_id, 'billing.payment.create')
  or private.has_permission(organization_id, 'billing.refund')
);

create policy audit_logs_authorized_read
on public.audit_logs for select to authenticated
using (
  organization_id is not null
  and private.has_permission(organization_id, 'audit.read')
);
;
