# Hospica — Production Readiness, Security & Stability Audit

**Date:** 2026-11-23
**Commit audited:** `2275e6cb295a645305c15222ce9b670f7f06a3fe` (`main`, deployed to https://hospica.vercel.app — verified via `/api/health` returning the same SHA)
**Method:** Static source review of all server actions, services, repositories, RLS migrations, shared permission/transition logic; read-only live probes of Supabase (role_permissions, notifications schema); browser checks at 390/768/900/1440px on production; `typecheck`, `lint`, `test`, `build` executed. **No code, schema, policy, env var, or production data was modified.**

---

## 1. Executive Summary

Hospica's security architecture is fundamentally sound: RLS is enabled on all 39 tables, permission checks are enforced server-side in services (not just hidden in navigation), the appointment booking RPC revalidates everything inside the database, appointment updates are guarded by a DB trigger enforcing the status graph and field immutability, and column-level grants prevent privilege escalation on `staff_memberships`.

The audit found **no CRITICAL vulnerabilities**. The most significant issues are:

1. **Notification identity is keyed to a mutable email field** — a patient can change `patients.email` and read/mark-read another patient's notifications (confirmed in code).
2. **Check-in is non-transactional and can leave permanently stuck appointments** — this already happened in production once; the stuck state has no self-service recovery path.
3. **Queue completion is not restricted to the assigned clinician** — any staff member with `queue.manage` (receptionist, nurse, doctor, admin) can mark a visit "with clinician" and "completed", and the encounter is closed, with no record of which clinician saw the patient.

The notifications migration (`read_at`, `channel`, `notifications_unread_idx`) is **already applied** — verified read-only against the live schema.

**Verdict: ready for continued production operation**, with the HIGH findings recommended for remediation before the next major release.

---

## 2. Repository and Architecture Findings

- Monorepo: `apps/web` (Next.js 16.4.6 App Router, React 19, Tailwind 4) + `packages/{database,shared,permissions,validation}`.
- Auth: Supabase Auth via `@supabase/ssr` cookie sessions. `src/proxy.ts` (Next 16 middleware convention) redirects unauthenticated users away from `/staff/*` and `/portal/*` — but only checks that *a* user exists; role enforcement happens in server components/services via `requireStaff()` / `requirePermission()` / `requirePatient()`. Verified: every staff page and patient page calls a guarded service; the `(portal)` layout renders `StaffAccessDenied` on `AuthorizationError`.
- Server actions: all in `src/server/actions/`; services in `src/server/services/`; repositories in `src/server/repositories/`. Clean layering.
- Only API route: `GET /api/health` → `{ok, commit}` — exposes commit SHA only, no secrets.
- `safeNextPath` prevents open redirects; `safeServerMessage` prevents internal error leakage to clients.

**Weaknesses noted (LOW):**
- `searchOrganizationPatients` (`reception.repository.ts:8`) is dead code — never called.
- `getNotificationsByEmail`, `markNotificationSent`, `markNotificationFailed`, `countUnreadPortalNotifications` in `notification.service.ts` are unused in production paths (email pipeline was never built).
- `findActiveMembership` (`staff.repository.ts:4`) uses `.maybeSingle()` — a user with **two active memberships** (multi-org) would get a PostgREST "multiple rows" error and be locked out. Single-org assumption is consistent with the rest of the app (`CLINIC_ORGANIZATION_ID` env), so this is a known limitation rather than a bug.

---

## 3. Critical Security Findings

**None confirmed.**

Closest candidates evaluated and cleared:
- Service-role key (`SUPABASE_SECRET_KEY`) is only referenced in `lib/supabase/admin.ts` (`import "server-only"`) — cannot reach the browser bundle. `.env.production` is gitignored and untracked; only `.env*.example` files are committed.
- Staff provisioning returns a temporary password in the server-action response — by design (shown once to the admin, `must_change_password=true` forces reset).
- `getAvailableAppointmentSlots` server action is callable unauthenticated — it exposes only public booking availability (clinician schedules already public via `is_public` policies). Intended.

---

## 4. Supabase RLS and Admin Client Audit

### RLS policy review (all verified against migration files)

| Area | Assessment |
|---|---|
| `patients` | Self-read via `auth_user_id`; staff read/write via `patient.*` permissions. **No self-UPDATE policy** (see F-01). No DELETE policy anywhere. |
| `appointments` | Self/staff read; insert guarded by `appointment_scope_valid` + ownership; update guarded by `guard_appointment_update` trigger (status graph, field immutability, patient cancel-only) + `guard_appointment_clinician` (assignable-doctor check). Solid. |
| `encounters` / `queue_entries` / `vitals` | Staff permission-gated; patient self-read on encounters/vitals. Queue write requires `queue.manage`. |
| `staff_memberships` | Self-read + `staff.manage` read/update; **column-level grant** restricts updates to `role_id, primary_facility_id, employee_number, job_title, registration_number, is_active` — `user_id`/`organization_id` cannot be changed via PostgREST. Last-admin and self-suspend protections exist in the action layer. |
| `notifications` | `service_role` full access + authenticated SELECT where `recipient_email = auth.users.email`. App uses admin client (see F-01). |
| `profiles` | Self/colleague read; self-update with **no column restriction** — a user can set own `professional_title`/`status` via direct PostgREST (cosmetic only; cannot become assignable clinician — `is_assignable_clinician` requires doctor membership). LOW. |
| `permissions`, `role_permissions` | `using (true)` for all authenticated — permission catalog is world-readable to any logged-in user. LOW information disclosure. |
| Public directory tables | `is_public`/`is_active` gated anon+authenticated reads — appropriate. |

### Admin client (`createAdminClient`) usage audit

| Location | Purpose | Auth verified before use? | Assessment |
|---|---|---|---|
| `appointment.repository.ts:60,62` | Patient appointment list/detail | Yes — `requirePatient()` → `patient.id` passed and `.eq("patient_id")` applied | Safe |
| `patient.repository.ts:10` | `updatePatientProfile` | Yes — `patient.id` from `requirePatient()`; zod-whitelisted fields | Safe fields, but `email` is whitelisted → enables F-01 |
| `notification.service.ts` (8 sites) | All notification reads/writes | Callers verify (`requirePatient` / staff context) | Recipient key is mutable email → F-01 |
| `reception.service.ts:38` | Encounter status sync on queue completion | `requirePermission` + `.eq("organization_id")` | Safe; best-effort, errors logged |
| `staff-management.repository.ts:35,44` | Staff provisioning + auth-user cleanup | `requirePermission(STAFF_MANAGE)` + org-scoped role/facility validation | Safe; compensation delete on failure |
| `staff.repository.ts:8` | `clearStaffPasswordSetup` | `requireStaff()` + membership id from context | Safe |

**No admin-client usage was found reachable with unverified or user-controlled identifiers.**

---

## 5. Clinical Workflow Integrity Findings

Traced: booking (RPC) → staff confirm → check-in → encounter + queue (`waiting_triage`) → triage (`in_triage` → vitals → `waiting_clinician`) → `with_clinician` → `completed`.

**Confirmed working:** unique index `encounters_appointment_unique` + `queue_entries.encounter_id UNIQUE` prevent duplicate encounters/queue rows; queue transition map is enforced in `canTransitionQueue`; terminal states have no outgoing transitions; encounter status check constraint accepts the synced values.

### F-02 — HIGH: Check-in is non-transactional and can strand an appointment permanently
- `reception.service.ts:18-20` — order is: `updateAppointmentStatus(checked_in)` → `createEncounter` → `createQueueEntry`, three separate writes, no transaction.
- If encounter/queue creation fails (RLS, network), the appointment is left `checked_in` with no encounter — **this exact state occurred in production** and required manual DB repair.
- Recovery is impossible through the app: `checkInAppointment` requires `status === "confirmed"` (`:17`) and `canTransition` allows `checked_in → in_progress` only — the appointment can never be re-checked-in.
- **Fix:** reorder (create encounter+queue first, then flip appointment status), add a repair path for `checked_in` appointments lacking encounters, or wrap in an RPC transaction.
- **Verify:** force a failure after step 1 and confirm recovery path exists.

### F-03 — HIGH: Queue completion is not clinician-scoped
- `transitionQueue` (`reception.service.ts:38`) gates `with_clinician`/`completed`/`cancelled` on `queue.manage` only. Live permissions: `queue.manage` is held by **organization_admin, receptionist, doctor, nurse** — verified via live `role_permissions` probe.
- Any of these roles can move a patient to "with clinician" → "completed", which also closes the encounter (`:38` admin sync) — with **no record of which clinician saw the patient** (`encounter.clinician_user_id` is only set at check-in from the appointment assignment).
- **Impact:** a visit can be marked clinically complete by front-desk staff with no clinical contact; no audit trail exists (see F-09).
- **Fix:** require the acting user to match `encounter.clinician_user_id` (or hold a supervisory permission) for `with_clinician`/`completed`; record `completed_by` on the queue entry.
- **Verify:** attempt completion as a non-assigned clinician → expect denial.

### F-04 — MEDIUM: Queue and appointment status tracks diverge
- Queue completion/cancellation syncs `encounters.status` but **never updates `appointments.status`** — the appointment stays `checked_in`/`in_progress` forever unless staff manually transitions it. Conversely, manually completing an appointment does not touch the queue/encounter.
- Observed user-facing symptom: "old one in progress shows completed" confusion.
- **Fix:** decide the source of truth (recommend: queue completion drives appointment → `completed`; appointment cancellation drives queue → `cancelled`) and sync both directions.

### F-05 — MEDIUM: TOCTOU on queue transitions
- `transitionQueue` reads the entry, validates `canTransitionQueue` on the stale read, then updates — no `WHERE status = <expected>` guard or DB trigger on `queue_entries`. Two staff acting concurrently can produce last-write-wins outcomes (e.g., cancel vs. complete racing).
- **Fix:** include expected current status in the UPDATE's WHERE clause, or add a transition-guard trigger like `guard_appointment_update`.

### F-06 — MEDIUM: Encounter status does not track consult lifecycle
- Encounter stays `open` from check-in until queue completion; starting a consult (`with_clinician`) does not set a distinct encounter state, and `encounter.clinician_user_id` is never updated if the appointment was unassigned at check-in.
- **Fix:** set encounter status/clinician on `with_clinician` transition.

### F-07 — LOW: Triage can be bypassed
- `transitionQueueAction` accepts `in_triage → waiting_clinician` directly, skipping `recordTriage`/vitals. Vitals are effectively optional.
- **Fix (optional):** require vitals record or an explicit "no vitals" flag before `waiting_clinician`.

---

## 6. Notifications and Migration Status

- **Migration `20261123120000_notifications_read_at_and_channel.sql` — APPLIED.** Verified read-only: `select id, read_at, channel from notifications` returns 200 with populated `read_at`/`channel` values.
- Migration file is correct: nullable `read_at`, `channel text not null default 'in_app'`, partial unread index on `(recipient_email) where read_at is null`.
- Notification triggers are wired at all four appointment lifecycle points; failures are caught + logged and never break the primary action (`appointment.service.ts:29-36`).
- Unread badge counts within the latest 20 notifications (client-side filter) — acceptable.
- Missing notification rows degrade gracefully: portal layout catches list errors → empty bell (`portal/layout.tsx`).

### F-01 — HIGH: Notification identity keyed to mutable `patients.email`
- `portal/layout.tsx` calls `listPortalNotifications(context.patient.email)`; `notification.actions.ts` uses `patient.email || user.email`; `markNotificationRead`/`markAllNotificationsRead` filter `recipient_email` by the same value.
- `patientProfileSchema` (`packages/validation/src/auth.schema.ts:9`) allows `email`, and `updatePatientProfile` writes it via admin client — **a patient can set `patients.email` to any address**.
- **Exploit:** set profile email to another patient's email → the portal bell then lists **that patient's** notifications (appointment service, facility, date — PHI-adjacent) and can mark them read. Booking notifications are also keyed to whatever email is typed in the booking form (`requestAppointment` → `input.email`).
- The RLS policy `notifications_user_select` compares against `auth.users.email`, which diverges from `patients.email` — the app bypasses RLS entirely via admin client, so the policy provides no protection here.
- **Fix:** key notifications to `patient.id` (or `auth_user_id`) instead of email; stop treating `patients.email` as an identity key. Add a `recipient_patient_id uuid` column.
- **Verify:** change profile email to a second test account's email → bell must still show only own notifications.

### F-08 — LOW: Email-channel notifications would stall
- `sendNotification` with `channel:"email"` inserts `status:"pending"` — no processor exists; rows would sit pending forever. Currently unused (in-app only).

---

## 7. Authentication and Permission Findings

Live `role_permissions` probe (read-only) confirms:

| Role | Portal access | Notes |
|---|---|---|
| organization_admin | Yes | All permissions incl. `staff.manage` |
| receptionist | Yes | `appointment.*`, `patient.*`, `encounter.create/read`, `queue.*`, `reception.checkin` — **no `triage.write`, no `encounter.update`** (correct separation) |
| doctor | Yes | `appointment.read` only (cannot change appointment status — correct), `encounter.*`, `queue.*`, clinical perms |
| nurse | Yes | `triage.write`, `encounter.update`, `queue.*`, `appointment.read` — no `encounter.create`, no `reception.checkin` |
| lab_technician, pharmacist, cashier, inventory_manager | **Cannot sign in** | None have `appointment.read`; `staffSignInAction` requires it → these accounts are dead ends |

### F-10 — MEDIUM: Operational roles cannot access the staff portal
- `staffSignInAction` (`staff-auth.actions.ts:125`) requires `APPOINTMENT_READ`. The four back-office roles have permissions for future modules (lab, pharmacy, billing, inventory) but no `appointment.read`, so their accounts can never log in — provisioning them produces unusable accounts.
- **Fix:** either grant a minimal portal permission set to these roles or restrict role choices in `createStaffAccountAction` until their modules ship.

### F-11 — LOW: UI shows actions the role cannot complete
- `/staff/reception/walk-in` renders for any staff member (no permission check in `walk-in/page.tsx`); submission fails server-side for roles without `reception.checkin`.
- Reception page shows "Check in" to any `appointment.read`+`queue.read` holder — doctors see the button but lack `reception.checkin` → server error on submit.
- **Fix:** gate these controls by permission (context.permissions already available).

### F-12 — LOW: `StartTriageButton` still swallows action results
- `triage-actions.tsx` calls `transitionQueueAction` in a plain form action and discards `{error}`/`{success}` — the same silent-failure pattern fixed elsewhere in `d5d890d`.

Other checks passed: last-admin protection, self-suspend protection, role org-scoping on assignment, column-grant on memberships, `safeNextPath`, staff login requires portal permission, patient login rejects staff (`ensurePatientForAuthenticatedUser` throws for staff memberships).

---

## 8. Patient Data Integrity Findings

- Profile persistence fix verified: `updatePatientProfile` uses admin client + `patient.id` from `requirePatient()` + `.select("id").single()` — real failures now throw; protected fields (`organization_id`, `auth_user_id`, `patient_number`) are not in the zod schema.
- Patient appointment reads use admin client but are double-filtered by verified `patient.id` — URL `id` tampering returns `notFound()`.
- Timestamp comparison fix (`04f89bc`) verified: `sameInstant()` compares `Date.getTime()` in `assignStaffAppointmentClinician` and `getAssignableCliniciansForAppointment`. The remaining string-equality comparison in `booking.service.ts:resolveGeneratedBookingSlot` compares two `generateSlots` outputs (same format) — safe, but fragile if formats ever diverge; recommend aligning it to instant comparison for consistency (LOW).
- `guard_appointment_update` trigger enforces: field immutability (except `clinician_user_id` for `appointment.update` holders), valid status transitions, patient cancel-only — at the DB level, so direct PostgREST writes are also constrained.
- **F-13 — MEDIUM: Walk-in patient creation has no deduplication** — `createWalkIn` matches by `patient_number` only; name+phone combos always create a new `patients` row → duplicate patient records over time.
- Patients belong to a single org (`findPatientByAuthUserId` `.maybeSingle()`); a patient registered in org A cannot book in org B — the RPC raises a generic error. Single-org limitation, acceptable for MVP (LOW).

---

## 9. Responsive UI and Accessibility Findings

Production spot-check (real browser, unauthenticated surfaces): **no horizontal overflow** at 390/768/900/1440px on `/`, `/login`, `/staff/login`, `/portal`.

Previously verified today with authenticated test accounts (local + production):
- Staff sidebar: grouped nav, collapsed 84px rail, mobile drawer with Escape close, `aria-hidden`/`inert`, focus return — all working at tested widths.
- Dashboard metric cards: no overflow at 1440/900/390; hover states confirmed.
- Patient portal: notification bell badge/panel/mark-read verified at desktop + mobile.
- Profile view↔edit toggle verified at both viewports.

**Remaining notes (LOW):**
- No `prefers-reduced-motion` audit was performed on the new hover transforms (small translateY — likely fine).
- Security headers: `next.config.ts` sets only `poweredByHeader:false` — no explicit CSP/X-Frame-Options/Referrer-Policy (Next defaults cover some; consider adding headers for defense-in-depth).
- Quick-links dock drag is pointer-only — keyboard users can't reposition it (click still works; acceptable progressive enhancement).

---

## 10. Performance and Reliability Findings

- Indexes are solid: appointments (org+schedule, patient+schedule desc, clinician, facility), queue_entries operational composite, notifications recipient/status/created_at/unread partial.
- **F-14 — MEDIUM: Unbounded queries** — `listAppointmentsForOrganization` loads **all** appointments ever for the org; the dashboard, reception page, and appointments page all consume it. Grows linearly; will degrade. Add date-window filters or pagination before data volume grows.
- `getAssignableCliniciansForAppointment` does 2 queries per clinician + slot generation — small N, acceptable.
- `requirePermission` = 2-3 sequential DB queries per call; pages call multiple services → redundant lookups per request. Consider request-scoped memoization (LOW).
- `getStaffDashboard`/`buildStaffDashboard` recomputes metrics in JS over the full appointment set each load — fine at current scale, part of F-14.
- `/api/health` correctly reports `VERCEL_GIT_COMMIT_SHA` — verified live (`2275e6c` matches `main`). No sensitive data exposed.
- All app routes are dynamic (ƒ) — no stale-cache risk for authed content.

---

## 11. Automated Test Results

| Check | Command | Result |
|---|---|---|
| TypeScript | `npm run typecheck --workspace=apps/web` | ✅ pass |
| ESLint | `npm run lint --workspace=apps/web` | ✅ pass |
| Unit tests | `npm run test` | ✅ 19 files / 107 tests pass |
| Production build | `npm run build` | ✅ 31 routes generated, all dynamic |
| Live deploy check | `curl /api/health` | ✅ commit `2275e6c` = local HEAD |
| Live schema probe | REST `select read_at, channel` | ✅ migration applied |
| Live permissions probe | REST `role_permissions` | ✅ matches expected grants |

Not run: destructive/concurrency tests against production (per instructions); no k6/load testing.

---

## 12. Outstanding Risks

1. Notification email-key spoofing (F-01) — confirmed, limited blast radius today but becomes serious if email channel ships.
2. Orphaned `checked_in` appointments have no in-app recovery (F-02) — already occurred once in production.
3. Queue/appointment status divergence (F-04) will produce confusing operational states at scale.
4. Clinician-agnostic visit completion (F-03) is a clinical-governance gap.
5. Single-org assumption is baked into provisioning (`CLINIC_ORGANIZATION_ID`) — fine for MVP, blocks multi-tenancy.

---

## 13. Prioritized Remediation Roadmap

| # | Severity | Action |
|---|---|---|
| 1 | HIGH | Re-key notifications to `patient_id`/`auth_user_id`; remove `email` from `patientProfileSchema` or stop using it as recipient key (F-01) |
| 2 | HIGH | Make check-in atomic (RPC transaction or reorder + repair path for `checked_in`-without-encounter) (F-02) |
| 3 | HIGH | Restrict `with_clinician`/`completed` queue transitions to the assigned clinician or a supervisory permission; record actor (F-03) |
| 4 | MEDIUM | Sync appointment status on queue completion/cancellation; sync encounter on consult start (F-04, F-06) |
| 5 | MEDIUM | Add expected-status guard to queue updates or a transition trigger (F-05) |
| 6 | MEDIUM | Resolve login access for lab/pharmacy/billing/inventory roles (F-10) |
| 7 | MEDIUM | Add pagination/date windows to appointment queries (F-14) |
| 8 | MEDIUM | Walk-in patient dedup strategy (F-13); audit logging for clinical transitions (F-09) |
| 9 | LOW | Permission-gate reception/walk-in/triage UI controls; fix `StartTriageButton` result handling; remove dead code; add security headers |

### Final verdict

- **Ready for continued production operation?** Yes — no critical vulnerabilities; core workflows verified live.
- **Critical/High issues?** Three HIGH findings (F-01, F-02, F-03), all remediable without architectural change.
- **Notifications migration required?** No — already applied and verified.
- **Five highest-priority actions:** items 1–5 in the roadmap above.
- **Safe to proceed with next phase:** patient portal UX, public website content, reporting dashboards (read-only), and notification Phase B planning — provided F-01 is fixed first if email/push delivery is on the roadmap.

### Audit limitations
- RLS was verified by policy-source review + live permission probes, not by attempting cross-tenant reads with real user JWTs (no destructive testing per instructions).
- Concurrency findings (F-05) are code-evident but were not race-tested against production.
- Visual/responsive verification covered unauthenticated production pages at 4 widths plus previously-verified authenticated surfaces; not every staff sub-page was re-rendered in this audit.
