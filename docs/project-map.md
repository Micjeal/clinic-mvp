# Project map (working context)

Snapshot of the clinic/hospital platform: Supabase backend + Next.js web app.
Generated from the live database and the repository on 2026-11-13.

## Identity

| Item | Value |
| --- | --- |
| Supabase project | `lophmbikvwhmfxoxvgap` (eu-west-1, Postgres 17.11, ACTIVE_HEALTHY) |
| Organization | C-care Organization (`clinic-mvp-test-organization`) |
| Facility | Main Test Facility (`TEST-MAIN`) |
| Locale | `Africa/Kampala`, `UGX`, country `UG` |
| Local repo | `Desktop/clinic-mvp` (npm workspaces monorepo) |
| Live data | 4 auth users, 4 profiles, 3 staff memberships, 3 patients, 0 appointments, 1 org, 1 facility, 5 departments, 6 services |

## Stack

- Next.js 16.4 (App Router), React 19.3, TypeScript 6.0, Tailwind 4.
- `@supabase/ssr` 0.12.7 + `@supabase/supabase-js` 2.117.2, Zod 4.6.
- Vitest for unit tests; ESLint + `tsc --noEmit` as quality gates.
- Packages: `apps/web`, `packages/database` (generated types), `packages/validation` (Zod), `packages/permissions`, `packages/shared`.
- No edge functions deployed. No DB views/materialized views.

## Layering

```text
UI / Server Component
  -> Server Action (parse + safe error mapping)
  -> Service (domain rules, auth + permission checks)
  -> Repository (Supabase table access)
  -> Supabase (RLS enforced)
```

- Server Components call services directly; HTTP routes exist only for `auth/callback`.
- `server-only` guards server clients, repositories, services, auth, and permissions.
- Browser/server clients use the publishable key only. `lib/supabase/admin.ts` (secret key)
  is used solely to clear `must_change_password` after a staff password change.

## Database model (38 public tables, all RLS enabled)

Tenancy and identity
- `organizations` -> `facilities` -> `departments`
- `profiles` (1:1 with `auth.users`, created by `private.handle_new_auth_user` trigger)
- `roles`, `permissions`, `role_permissions` (org-scoped roles; global permission keys)
- `staff_memberships` (user + org + role + primary facility) -> `staff_department_assignments`, `staff_service_assignments`

Patients and appointments
- `patients` (org-scoped, optional `auth_user_id`, generated `patient_number` `PT-YYMM-####`)
- `appointments` (patient, facility, department, optional service, optional clinician; status machine)
- `encounters` (outpatient/inpatient visit, can link an appointment)
- `queue_entries` (waiting_triage -> triage -> ready_for_clinician)

Clinical (schema/RLS only, no UI yet)
- `vitals`, `clinical_notes`, `diagnoses`
- `lab_tests`, `lab_orders`, `lab_order_items`, `lab_results`
- `medications`, `prescriptions`, `prescription_items`
- `inventory_items`, `stock_movements`
- `invoices`, `invoice_items`, `payments`
- `audit_logs`
- `services` (bookable catalog with duration and price)

Clinician directory
- `clinician_profiles`, `clinician_specializations`, `clinician_qualifications`,
  `clinician_achievements`, `clinician_availability_rules`,
  `clinician_availability_exceptions`, `clinician_photo_objects`

## Authorization model

- Permission check: `private.has_permission(org_id, permission_key)` = active membership in that
  org + the permission present on the membership's role.
- Org scoping: `private.is_org_member`, `private.shares_org` (colleague profile reads).
- Scope integrity: `private.appointment_scope_valid(org, facility, department, service)`.
- Seeded roles (8): organization_admin (37 perms), doctor (12), nurse (10), receptionist (10),
  lab_technician (5), pharmacist (5), cashier (4), inventory_manager (2).
- 36 permission keys, including `appointment.*`, `patient.*`, `encounter.*`, `lab.*`,
  `pharmacy.*`, `billing.*`, `inventory.*`, `queue.*`, `staff.manage`, `settings.manage`.
- 101 policies in `public`; each exposed table has a policy per operation, plus public read
  policies for `organizations`, `facilities`, `departments`, `services`, `lab_tests`.

Appointment invariants (defense in depth)
- Insert allowed for `appointment.create` staff, or a patient self-requesting
  (`status='requested'`, `created_by=auth.uid()`, patient owned by caller).
- Update allowed for `appointment.update` staff or the owning patient.
- `private.guard_appointment_update` / `guard_patient_appointment_update` enforce:
  detail fields immutable after creation (staff with `appointment.update` may change
  only `clinician_user_id`), patients can only cancel
  (`requested|scheduled|confirmed -> cancelled`), and an explicit status transition map.
- Statuses: requested, scheduled, confirmed, checked_in, in_progress, completed, cancelled, no_show.

RPCs
- `request_patient_appointment(...)` -> `private.request_patient_appointment_impl` (patient self-booking)
- `replace_clinician_assignments`, `replace_clinician_availability`, `replace_clinician_profile`
- `get_public_clinician_directory()`, `get_public_clinician_schedule(...)` (SECURITY DEFINER, anon-callable)
- `rls_auto_enable()` (maintenance helper)

## Implemented in the web app

Public site: home, about, departments (list/detail), doctors (list/detail), services,
facilities, contact, appointment request, login, register.
Patient portal: overview, appointment list/new/detail, profile, help.
Staff portal: dashboard, appointments (list/detail + status/clinician assignment),
reception (walk-in check-in), queue, triage (list/detail), users (list/new/detail with doctor
management, clinical setup, public profile publishing), forced password change.

Validated server actions: appointment, auth, reception, staff-appointment, staff-auth,
staff-management, staff-password. Tests cover appointment status rules, portal booking,
doctor correctness contract, staff access/route rules, and scheduling.

## Migration state

31 migrations, local files and remote history are in sync, from `clinic_core_foundation`
(2026-10-06) through `department_opening_hours_array_support` (2026-11-13).
Storage bucket `clinician-photos` (public) holds clinician images and is mirrored in
`clinician_photo_objects`.

## Known gaps and advisories

- Clinical, lab, pharmacy, inventory, and billing modules are database-only; no UI or services.
- No appointment/clinical seed data; booking flows are untested against real records.
- Availability rules support `effective_from` / `effective_to`; the public schedule RPC,
  the app slot engine, and the staff availability editor all honour them, and windows can
  be set in the UI.
- Department `opening_hours` are enforced by the booking RPC and the app slot engine, so
  closed days and times no longer produce bookable slots.
- Appointment clinician assignment is validated in the database (active doctor in the
  same organization, assigned to the department and service/facility).
- `apps/web/src/config/site.ts` still has placeholder branding.
- SMTP is not configured; staff are provisioned manually with a temporary password.
- Advisor warnings: `anon`/`authenticated` can see 25/38 tables in the GraphQL schema
  (`pg_graphql` exposure), and two anon-executable SECURITY DEFINER functions
  (`get_public_clinician_*`) by design.
- Advisor perf: 15 unindexed foreign keys, 93 unused indexes, 6 multiple-permissive policies,
  1 duplicate index.
- `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`) must be configured server-side for the
  staff password setup flow.
