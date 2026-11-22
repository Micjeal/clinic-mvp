# Phase 0: Read-Only Baseline Audit

**Date:** 2026-11-22  
**Live Application:** https://hospica.vercel.app  
**GitHub Repository:** https://github.com/Micjeal/clinic-mvp  
**Supabase Project:** `lophmbikvwhmfxoxvgap`  
**Audit Type:** Read-only baseline before any modifications

---

## Executive Summary

The Hospica MVP is a deployed, functional clinic management platform with an established architecture. The application is live on Vercel with a monorepo structure using npm workspaces. The codebase shows professional architecture with proper layering (UI → Server Actions → Services → Repositories → Supabase), comprehensive RLS policies, and defensive security practices.

**CRITICAL FINDING:** The production build fails due to a Next.js security vulnerability that requires an upgrade.

---

## 1. Git Repository Status

### Current State
- **Branch:** `main` (only branch)
- **Status:** Clean working tree, up to date with origin
- **Latest Commit:** `7e618e1` - "Simplify vercel.json and update deployment docs"
- **Remote:** https://github.com/Micjeal/clinic-mvp.git
- **Commit History (4 commits):**
  1. `7e618e1` - Simplify vercel.json and update deployment docs
  2. `f2bf53a` - Remove rootDirectory from vercel.json
  3. `869f6e6` - Update .gitignore to exclude supabase/.temp/
  4. `0c66ed0` - Initial commit - Clinic Platform MVP with Vercel deployment setup

### Assessment
- Repository is clean and properly initialized
- No feature branches exist (all work has been on main)
- Recent commits show deployment preparation work
- **RISK:** No separate feature branch workflow established

---

## 2. Application Architecture

### Technology Stack
- **Framework:** Next.js 16.4.0 (App Router, Turbopack)
- **UI:** React 19.3.0, TypeScript 6.0.3, Tailwind CSS 4.3.3
- **Database:** Supabase (PostgreSQL 17.11, eu-west-1)
- **Auth:** @supabase/ssr 0.12.7, @supabase/supabase-js 2.117.2
- **Validation:** Zod 4.6.5
- **Testing:** Vitest 5.0.3
- **Linting:** ESLint 9.39.5

### Monorepo Structure
```
apps/web              # Next.js presentation layer
packages/database     # Generated Supabase TypeScript types
packages/validation   # Domain Zod schemas
packages/permissions  # Shared permission constants
packages/shared       # Framework-neutral helpers
supabase/migrations  # 31 database migrations
```

### Architecture Layering
```
UI / Server Component
  → Server Action (parse + safe error mapping)
  → Service (domain rules, auth + permission checks)
  → Repository (Supabase table access)
  → Supabase (RLS enforced)
```

**Assessment:** Architecture is well-designed with clear separation of concerns and proper security boundaries.

---

## 3. Route Structure

### Public Routes (13 pages)
- `/` - Homepage
- `/about` - About page
- `/appointments` - Appointment request page
- `/contact` - Contact page
- `/departments` - Department list
- `/departments/[id]` - Department detail
- `/doctors` - Doctor list
- `/doctors/[slug]` - Doctor detail
- `/facilities` - Facilities page
- `/login` - Patient login
- `/register` - Patient registration
- `/services` - Services page
- `/auth/callback` - Auth callback (HTTP route)

### Patient Portal Routes (5 pages)
- `/portal` - Patient dashboard
- `/portal/appointments` - Appointment list
- `/portal/appointments/[id]` - Appointment detail
- `/portal/appointments/new` - New appointment
- `/portal/profile` - Patient profile
- `/portal/help` - Help page

### Staff Portal Routes (15 pages)
- `/staff/login` - Staff login
- `/staff/change-password` - Staff password change
- `/staff/(portal)` - Staff dashboard
- `/staff/(portal)/appointments` - Staff appointment management
- `/staff/(portal)/appointments/[id]` - Appointment detail
- `/staff/(portal)/queue` - Operational queue
- `/staff/(portal)/reception` - Reception desk
- `/staff/(portal)/reception/walk-in` - Walk-in check-in
- `/staff/(portal)/triage` - Triage list
- `/staff/(portal)/triage/[id]` - Triage detail
- `/staff/(portal)/users` - Staff directory
- `/staff/(portal)/users/[id]` - Staff detail
- `/staff/(portal)/users/new` - New staff user

**Assessment:** Complete route structure for MVP scope (public site, patient portal, staff portal).

---

## 4. Server Actions (7 files)

1. `appointment.actions.ts` - Patient appointment booking/cancellation
2. `auth.actions.ts` - Patient sign-in, sign-up, sign-out
3. `reception.actions.ts` - Reception check-in workflow
4. `staff-appointment.actions.ts` - Staff appointment management
5. `staff-auth.actions.ts` - Staff authentication
6. `staff-management.actions.ts` - Staff user management
7. `staff-password.actions.ts` - Staff password setup/change

**Assessment:** Server actions properly implement form parsing, validation, and error handling.

---

## 5. Services Layer (14 files)

- `appointment.service.ts` - Appointment business logic
- `auth.service.ts` - Authentication operations
- `booking.service.ts` - Booking workflow
- `department.service.ts` - Department queries
- `facility.service.ts` - Facility queries
- `patient.service.ts` - Patient provisioning
- `public-clinician.service.ts` - Public clinician directory
- `reception.service.ts` - Reception operations
- `scheduling.service.ts` - Scheduling logic
- `service.service.ts` - Service queries
- `staff-dashboard.service.ts` - Staff dashboard data
- `staff-password.service.ts` - Staff password management
- `staff-portal.service.ts` - Staff portal logic
- `queue-status.test.ts` - Queue status tests
- `scheduling.service.test.ts` - Scheduling tests

**Assessment:** Comprehensive service layer with proper separation of concerns.

---

## 6. Repositories Layer (10 files)

- `appointment.repository.ts` - Appointment data access
- `clinician.repository.ts` - Clinician data access
- `department.repository.ts` - Department data access
- `facility.repository.ts` - Facility data access
- `patient.repository.ts` - Patient data access
- `reception.repository.ts` - Reception data access
- `scheduling.repository.ts` - Scheduling data access
- `service.repository.ts` - Service data access
- `staff-management.repository.ts` - Staff management data access
- `staff.repository.ts` - Staff data access

**Assessment:** Proper repository pattern implementation for data access.

---

## 7. Database Schema (31 Migrations)

### Migration Timeline
- **2026-10-06:** Core foundation, security, operations modules, FK indexes
- **2026-10-06:** Appointment MVP patient self-service, scope hardening
- **2026-10-06:** Release hardening appointment security
- **2026-10-07:** Staff password setup, clinician scheduling, reception/queue/triage
- **2026-10-07:** Public clinician directory, service duration, profile content
- **2026-10-09:** Clinician photo storage, doctor management correctness
- **2026-10-10:** Fix clinician photo object scope
- **2026-11-13:** Restore clinician assignment guard, schedule effective dates, department opening hours, appointment integrity

### Table Structure (38 public tables)

**Tenancy & Identity:**
- `organizations`, `facilities`, `departments`
- `profiles` (1:1 with auth.users)
- `roles`, `permissions`, `role_permissions`
- `staff_memberships`, `staff_department_assignments`, `staff_service_assignments`

**Patients & Appointments:**
- `patients` (with patient_number sequence)
- `appointments` (with status machine)
- `encounters`, `queue_entries`

**Clinical (schema only, no UI):**
- `vitals`, `clinical_notes`, `diagnoses`
- `lab_tests`, `lab_orders`, `lab_order_items`, `lab_results`
- `medications`, `prescriptions`, `prescription_items`
- `inventory_items`, `stock_movements`
- `invoices`, `invoice_items`, `payments`
- `audit_logs`
- `services`

**Clinician Directory:**
- `clinician_profiles`, `clinician_specializations`, `clinician_qualifications`
- `clinician_achievements`, `clinician_availability_rules`, `clinician_availability_exceptions`
- `clinician_photo_objects`

### RLS Status
- **ALL 38 tables have RLS enabled**
- 101 policies across all tables
- Public read policies for: organizations, facilities, departments, services, lab_tests, clinician_profiles

### SECURITY DEFINER Functions
- `private.set_updated_at()` - Updated at trigger
- `private.is_org_member(uuid)` - Organization membership check
- `private.has_permission(uuid, text)` - Permission check
- `private.shares_org(uuid)` - Colleague check
- `private.handle_new_auth_user()` - Profile creation on auth
- `private.guard_patient_appointment_update()` - Patient appointment update guard
- `get_public_clinician_directory()` - Public clinician RPC (anon-callable)
- `get_public_clinician_schedule(...)` - Public schedule RPC (anon-callable)

### Triggers
- `on_auth_user_created_create_profile` - Auto-create profile on auth
- `guard_patient_appointment_update` - Enforce patient update rules
- Updated at triggers on all major tables

### Constraints
- Patient number unique constraint (org + patient_number)
- Patient auth_user_id unique constraint (org + auth_user_id)
- Clinician overlap exclusion constraint (no double-booking)
- Appointment status check constraints
- Department opening hours array support

**Assessment:** Database schema is comprehensive, properly secured with RLS, and includes defensive constraints.

---

## 8. Authorization Model

### Roles (8 system roles)
1. `organization_admin` - 37 permissions (full access)
2. `doctor` - 12 permissions (clinical workflows)
3. `nurse` - 10 permissions (triage, nursing)
4. `receptionist` - 10 permissions (patient registration, appointments)
5. `lab_technician` - 5 permissions (lab results)
6. `pharmacist` - 5 permissions (dispensing)
7. `cashier` - 4 permissions (billing)
8. `inventory_manager` - 2 permissions (stock control)

### Permissions (36 permission keys)
- `organization.manage`, `facility.manage`, `department.manage`, `staff.manage`
- `patient.read`, `patient.create`, `patient.update`
- `appointment.read`, `appointment.create`, `appointment.update`
- `encounter.read`, `encounter.create`, `encounter.update`
- `triage.write`, `clinical_note.write`, `diagnosis.write`
- `lab.read`, `lab.order`, `lab.result.write`, `lab.result.approve`
- `pharmacy.read`, `pharmacy.dispense`
- `inventory.read`, `inventory.adjust`
- `billing.read`, `billing.invoice.create`, `billing.payment.create`, `billing.refund`
- `queue.read`, `queue.manage`, `reception.checkin`
- `reports.read`, `audit.read`, `settings.manage`

### Authorization Functions
- `private.has_permission(org_id, permission_key)` - Checks active membership + role permission
- `private.is_org_member(org_id)` - Checks active organization membership
- `private.shares_org(user_id)` - Checks colleague relationship

**Assessment:** Comprehensive RBAC with proper scoping and 101 RLS policies.

---

## 9. Code Quality Results

### TypeScript (PASS ✓)
```
npm run typecheck
Exit code: 0
```
- No TypeScript errors
- Type checking successful

### ESLint (PASS ✓)
```
npm run lint
Exit code: 0
```
- No linting errors
- Code quality checks passed

### Tests (PASS ✓)
```
npm run test
Test Files: 16 passed (16)
Tests: 82 passed (82)
Duration: 3.20s
```
- All unit tests passing
- Test coverage includes:
  - Appointment status rules
  - Portal booking
  - Doctor correctness contract
  - Staff access/route rules
  - Scheduling logic

### Production Build (FAIL ✗ - CRITICAL)
```
npm run build
Error [SecurityFatalError]: Your version of Next.js is affected by a known security vulnerability.
```
- **BLOCKER:** Next.js 16.4.0 has a security vulnerability
- Build stopped to show upgrade recommendation
- Required upgrade command: `next upgrade --agent=security --internal-nudge-id=2167dd0d-7828-4a63-8f53-f8e06615134a`

**Assessment:** All quality checks pass except production build due to security vulnerability.

---

## 10. Environment Variables

### Required Environment Variables (names only, values concealed)

**Public (exposed to browser):**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key
- `NEXT_PUBLIC_SITE_URL` - Production site URL (currently localhost:3000)

**Server-only (secret):**
- `SUPABASE_SECRET_KEY` - Supabase service role key (or SUPABASE_SERVICE_ROLE_KEY)
- `CLINIC_ORGANIZATION_ID` - Organization UUID
- `CLINIC_DEFAULT_FACILITY_ID` - Default facility UUID

### Current Local Configuration
- `NEXT_PUBLIC_SITE_URL` is set to `http://localhost:3000` (needs production URL)
- `CLINIC_ORGANIZATION_ID` and `CLINIC_DEFAULT_FACILITY_ID` use placeholder UUIDs
- `SUPABASE_SECRET_KEY` is present in local .env.local

**Assessment:** Environment variable structure is correct, but production values need verification.

---

## 11. Site Configuration

### Current State (`apps/web/src/config/site.ts`)
```typescript
export const site = {
  name: "Clinic name not configured",
  description: "Clinic information is being prepared.",
  phone: "Phone not configured",
  email: "Email not configured",
  address: "Address not configured",
} as const;
```

### Fallback Mechanism (`apps/web/src/lib/public-content.ts`)
- Uses placeholder pattern detection
- Falls back to "Patient care clinic" for name
- Falls back to generic description
- Falls back to "details are being prepared" for contact info

**Assessment:** Placeholder configuration with graceful fallbacks preventing broken UI.

---

## 12. Documentation Review

### README.md vs project-map.md Discrepancy

**README.md states:**
> "The linked Supabase project currently has no clinic seed records."

**project-map.md states:**
> "Live data: 4 auth users, 4 profiles, 3 staff memberships, 3 patients, 0 appointments, 1 org, 1 facility, 5 departments, 6 services"

**Assessment:** Documentation inconsistency - project-map.md indicates test data exists in production database while README claims no seed records. This needs verification against actual Supabase instance.

---

## 13. Supabase Configuration

### Auth Configuration
- Project: `lophmbikvwhmfxoxvgap` (eu-west-1, Postgres 17.11)
- Status: ACTIVE_HEALTHY
- Callback route: `/auth/callback` exists in Next.js
- **NEEDS VERIFICATION:** Site URL configured in Supabase Auth settings

### Storage
- Bucket: `clinician-photos` (public)
- Storage policies exist for clinician photo objects

### Database State (from project-map.md)
- 4 auth users
- 4 profiles
- 3 staff memberships
- 3 patients
- 0 appointments
- 1 organization: "C-care Organization" (`clinic-mvp-test-organization`)
- 1 facility: "Main Test Facility" (`TEST-MAIN`)
- 5 departments
- 6 services
- Locale: Africa/Kampala, UGX, country UG

**Assessment:** Database has test organization/facility data but no appointment data for testing booking flows.

---

## 14. Known Gaps (from project-map.md)

### Database Schema Only (No UI/Services)
- Clinical module (vitals, clinical notes, diagnoses)
- Laboratory module (lab tests, orders, results)
- Pharmacy module (medications, prescriptions)
- Inventory module (inventory items, stock movements)
- Billing module (invoices, payments)

### Missing Features
- No appointment/clinical seed data
- Booking flows untested against real records
- SMTP not configured (staff provisioned manually with temporary password)
- No end-to-end testing

### Performance Advisor Warnings
- 15 unindexed foreign keys
- 93 unused indexes
- 6 multiple-permissive policies
- 1 duplicate index

### Security Advisor Warnings
- `anon`/`authenticated` can see 25/38 tables in GraphQL schema (pg_graphql exposure)
- Two anon-executable SECURITY DEFINER functions (`get_public_clinician_*`) by design

**Assessment:** These are acknowledged gaps not critical to MVP scope.

---

## 15. Deployment Risks

### Critical Risk
1. **Next.js Security Vulnerability** - Version 16.4.0 has a known security issue blocking production builds

### High Risk
2. **Environment Variables** - Production Vercel deployment may have incorrect environment variable values
3. **Supabase Auth URL** - Site URL may not be configured to `https://hospica.vercel.app`
4. **No Feature Branch Workflow** - All work done on main branch

### Medium Risk
5. **Placeholder Configuration** - Clinic branding not configured
6. **Missing Test Data** - No appointment records for testing booking flows
7. **Documentation Inconsistency** - Seed data discrepancy between docs

### Low Risk
8. **Missing Assets** - No favicon.ico, robots.txt, sitemap.xml
9. **Performance Indexes** - Some unused indexes and unindexed foreign keys

---

## 16. Completed Functionality

### Public Website
- ✓ Homepage with navigation
- ✓ Department listing and detail pages
- ✓ Doctor (clinician) listing and detail pages
- ✓ Services listing
- ✓ Facilities page
- ✓ Contact page
- ✓ About page
- ✓ Appointment request page
- ✓ Patient login
- ✓ Patient registration

### Patient Portal
- ✓ Patient dashboard
- ✓ Appointment list
- ✓ Appointment detail view
- ✓ New appointment booking
- ✓ Patient profile
- ✓ Help page
- ✓ Authentication with email confirmation
- ✓ Patient provisioning (prevents duplicate records)
- ✓ Patient appointment cancellation

### Staff Portal
- ✓ Staff login
- ✓ Staff dashboard
- ✓ Staff appointment management (list, detail, status updates)
- ✓ Clinician assignment
- ✓ Reception desk
- ✓ Walk-in check-in
- ✓ Queue management
- ✓ Triage management
- ✓ Staff user management (list, new, detail)
- ✓ Doctor management (clinical setup, public profile)
- ✓ Staff password setup/change
- ✓ Permission-based access control

### Security
- ✓ RLS enabled on all 38 tables
- ✓ 101 RLS policies
- ✓ SECURITY DEFINER functions with proper grants
- ✓ Patient ownership enforcement
- ✓ Organization isolation
- ✓ Appointment update guards (patients can only cancel)
- ✓ Clinician overlap prevention (no double-booking)
- ✓ Server-only guards for sensitive modules
- ✓ Safe error mapping (no sensitive data exposure)

---

## 17. Partially Completed Functionality

### Public Site Configuration
- ⚠ Clinic name, description, contact details are placeholders
- ⚠ Has fallback mechanism so UI works but shows generic text
- ⚠ Needs actual clinic branding configuration

### Appointment Booking
- ⚠ Availability rules support effective dates but no real clinician data
- ⚠ Department opening hours enforced but no real schedule data
- ⚠ Booking engine functional but untested against real records

### Staff Password Setup
- ⚠ SMTP not configured (manual staff provisioning)
- ⚠ Uses temporary password workflow
- ⚠ Requires SUPABASE_SECRET_KEY for password setup flow

---

## 18. Missing Functionality

### Within MVP Scope
- ❌ Real clinic branding (name, description, contact details)
- ❌ Production environment variable configuration
- ❌ Supabase Auth Site URL configuration
- ❌ Test appointment data for booking flow validation
- ❌ End-to-end testing suite
- ❌ CI/CD automation

### Outside MVP Scope (Intentionally Not Implemented)
- ❌ Clinical module UI (vitals, notes, diagnoses)
- ❌ Laboratory module UI
- ❌ Pharmacy module UI
- ❌ Inventory module UI
- ❌ Billing module UI
- ❌ Hospital admission workflows

---

## 19. Existing Bugs

### Critical
1. **Next.js Security Vulnerability** - Build fails due to security issue in Next.js 16.4.0

### Potential Issues (Not Verified)
2. **Patient Registration Race Condition** - Code has concurrent patient creation handling, but not tested under load
3. **Appointment Concurrency** - Database has overlap constraint, but concurrent booking not tested
4. **Auth Callback** - May fail if Supabase Auth Site URL not configured correctly

---

## 20. Security Concerns

### High Priority
1. **Next.js Security Vulnerability** - Must upgrade before production deployment
2. **Environment Variables** - Need to verify production Vercel environment variables are correct
3. **Supabase Auth Configuration** - Site URL must be set to production domain

### Medium Priority
4. **Service Role Key** - Must be configured server-side for staff password setup
5. **GraphQL Exposure** - Advisor warns about pg_graphql exposing 25/38 tables (by design for public queries)
6. **Anon-executable Functions** - Two SECURITY DEFINER functions callable by anon (by design for public clinician directory)

### Low Priority
7. **Unused Indexes** - Performance optimization, not security
8. **Unindexed Foreign Keys** - Performance optimization, not security

**Assessment:** Security model is fundamentally sound with proper RLS, but configuration verification needed.

---

## 21. Database Concerns

### Schema
- ✓ All migrations applied (31 migrations)
- ✓ RLS enabled on all tables
- ✓ Proper foreign key relationships
- ✓ Defensive constraints (overlap prevention, status checks)
- ✓ Triggers for updated_at and profile creation

### Data
- ⚠ Only test organization/facility data
- ⚠ No appointment records for testing
- ⚠ Patient registration creates records but no test patients
- ⚠ Clinician scheduling exists but no real availability data

### Performance
- ⚠ 15 unindexed foreign keys (may impact query performance)
- ⚠ 93 unused indexes (cleanup needed)
- ⚠ 1 duplicate index (cleanup needed)

**Assessment:** Schema is solid, but lacks test data for booking flow validation.

---

## 22. Tests Status

### Passing Tests (82 tests across 16 test files)
- ✓ Appointment status rules
- ✓ Portal booking logic
- ✓ Doctor correctness contract
- ✓ Staff access/route rules
- ✓ Scheduling logic
- ✓ Queue status

### Missing Tests
- ❌ End-to-end tests (entire user flows)
- ❌ Integration tests (with real Supabase)
- ❌ Concurrency tests (race conditions)
- ❌ Visual regression tests
- ❌ Accessibility tests

**Assessment:** Unit test coverage is good for core logic, but lacking E2E testing.

---

## 23. Summary of Findings

### What Works Well
1. ✅ Professional architecture with clear layering
2. ✅ Comprehensive RLS with 101 policies
3. ✅ Complete MVP route structure (public, patient, staff)
4. ✅ Proper authorization model (RBAC)
5. ✅ Defensive security (server-only, safe error mapping)
6. ✅ Database constraints (overlap prevention, status checks)
7. ✅ All unit tests passing (82 tests)
8. ✅ TypeScript and linting passing

### What Needs Immediate Attention
1. 🔴 **CRITICAL:** Next.js security vulnerability blocking builds
2. 🟠 **HIGH:** Production environment variable verification
3. 🟠 **HIGH:** Supabase Auth Site URL configuration
4. 🟠 **HIGH:** Feature branch workflow establishment

### What Needs Phase 1 Work
1. 🟡 Clinic branding configuration
2. 🟡 Real organization/facility UUID configuration
3. 🟡 Supabase Auth callback URL verification
4. 🟡 Test data creation for booking flows

### What Needs Later Phases
1. 🟢 End-to-end testing suite
2. 🟢 CI/CD automation
3. 🟢 Performance index cleanup
4. 🟢 SMTP configuration for email delivery

---

## 24. Recommendations

### Immediate (Before Any Phase Work)
1. **Upgrade Next.js** to fix security vulnerability
2. **Verify Vercel environment variables** match requirements
3. **Configure Supabase Auth Site URL** to `https://hospica.vercel.app`
4. **Establish feature branch workflow** - never work directly on main

### Phase 1 Preparation
5. Gather actual clinic branding details (name, description, contact info)
6. Obtain real organization/facility UUIDs from Supabase database
7. Verify Supabase Auth redirect URLs include `/auth/callback`
8. Create test appointment data for booking flow validation

### Phase 2-6 Preparation
9. Design end-to-end test scenarios
10. Set up CI/CD pipeline (GitHub Actions or Vercel)
11. Plan performance index cleanup (non-blocking)
12. Plan SMTP configuration for production email delivery

---

## 25. Production Deployment Risks

### Blockers
- ❌ Next.js security vulnerability prevents production builds

### High Risk
- ⚠️ Environment variables may not be correctly configured in Vercel
- ⚠️ Supabase Auth Site URL may not be set to production domain
- ⚠️ No feature branch workflow increases risk of breaking production

### Medium Risk
- ⚠️ Placeholder clinic branding shows generic text
- ⚠️ No test data for booking flow validation
- ⚠️ Documentation inconsistency regarding seed data

### Low Risk
- ⚠️ Missing SEO assets (favicon, robots.txt, sitemap)
- ⚠️ Performance optimization needed (unused indexes)

---

## Conclusion

The Hospica MVP is a well-architected, professionally implemented clinic management platform with proper security boundaries, comprehensive RLS, and defensive coding practices. The codebase shows high quality with passing tests, type checking, and linting.

**Critical Issue:** The Next.js security vulnerability must be resolved before any production deployment.

**Next Steps:** 
1. Upgrade Next.js to fix security vulnerability
2. Verify production environment configuration
3. Proceed with Phase 1 (Public Clinic Configuration) only after approval

**Overall Assessment:** The application is fundamentally sound and ready for MVP completion work, but requires immediate security fix and configuration verification before proceeding with phased enhancements.
