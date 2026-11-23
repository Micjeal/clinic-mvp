# Hospica — Phase 1 Production Remediation Report

**Baseline:** `main` @ `d5e1a43` (post-audit)
**Scope:** HIGH findings F-01, F-02, F-03 from `HOSPICA_PRODUCTION_READINESS_AUDIT.md`
**Status:** Code complete, tested, built. **Migrations NOT applied. Do NOT push to `main` until both migrations are applied in Supabase** — the new code references `recipient_patient_id`, the `check_in_appointment` RPC, and new `queue_entries` columns that do not exist in production yet.

---

## 1. Summary of changes

| Finding | Fix |
|---|---|
| F-01 Notification identity | Notifications now keyed by `recipient_patient_id` → `patients.id`. Email kept as contact info only. All portal queries, unread counts and mark-as-read are patient-id scoped. |
| F-02 Non-transactional check-in | New `public.check_in_appointment(uuid)` RPC performs encounter + queue + appointment-status writes in one transaction, idempotent under retries and concurrent calls. |
| F-03 Unrestricted queue completion | New permissions `queue.clinical` (doctor, org admin) and `queue.override` (org admin). `with_clinician`/`completed` transitions require the assigned clinician or a supervised override with a mandatory recorded reason. Consult start/completion actors and override reasons are persisted on `queue_entries`. |

## 2. Modified files

**Migrations (manual application required):**
- `supabase/migrations/20261125120000_notification_patient_identity.sql` — F-01
- `supabase/migrations/20261125120100_atomic_checkin_and_clinical_queue.sql` — F-02 + F-03

**Code:**
- `apps/web/src/server/services/notification.service.ts` — rewrote around `recipient_patient_id`; email optional contact field.
- `apps/web/src/server/services/appointment.service.ts` — all four notification producers pass `recipientPatientId`; removed redundant appointment-status write after check-in.
- `apps/web/src/server/services/reception.service.ts` — `checkInAppointment` now calls the RPC; `transitionQueue` enforces clinical completion rules and records consult actors/override reason.
- `apps/web/src/server/actions/notification.actions.ts` — mark read/all scoped by `patient.id`.
- `apps/web/src/server/actions/reception.actions.ts` — `transitionQueueAction` accepts `override_reason` from the form.
- `apps/web/src/server/auth/patient-portal-context.ts`, `apps/web/src/app/portal/layout.tsx` — notifications loaded by patient id.
- `apps/web/src/server/services/staff-portal.service.ts` — context now exposes `userId`.
- `apps/web/src/app/staff/(portal)/queue/page.tsx` — per-entry clinical authorization: assigned clinician sees actions with `queue.clinical`; supervisors see them with a required reason input; everyone else sees nothing.
- `apps/web/src/features/staff/components/reception-actions.tsx` — override reason input on clinical transitions.
- `apps/web/src/features/appointments/types/staff-appointment.types.ts`, `apps/web/src/server/repositories/appointment.repository.ts` — patient `id` added to staff appointment mapping.
- `apps/web/src/styles/globals.css` — override reason input style.
- `packages/permissions/src/index.ts` — `QUEUE_CLINICAL`, `QUEUE_OVERRIDE`.
- `packages/database/src/database.types.ts` — types for new columns/RPC.

**Tests:**
- `apps/web/src/server/services/notification.service.test.ts` — updated for patient-id keying + isolation assertions.
- `apps/web/src/server/services/reception.service.test.ts` — **new**, 12 tests covering RPC delegation, idempotency, error mapping, and all F-03 authorization paths.
- `apps/web/src/server/services/appointment.service.test.ts`, `staff-dashboard.test.ts` — fixtures updated.

## 3. Database migrations

### `20261125120000_notification_patient_identity.sql`
- Adds `notifications.recipient_patient_id uuid → patients.id` (nullable, `on delete set null`).
- Drops `NOT NULL` on `recipient_email` (now optional contact info).
- Adds indexes on `recipient_patient_id` (all + unread partial).
- **Backfill:** (a) `metadata.appointment_id → appointments.patient_id` — reliable; (b) email match only when exactly one patient has that email — conservative, ambiguous rows stay `NULL` (they become invisible rather than risk misdelivery).
- Replaces `notifications_user_select` RLS: patient-id match OR auth-email match (auth email can't be silently changed, so the OR clause is safe and preserves access to unbackfilled rows).

### `20261125120100_atomic_checkin_and_clinical_queue.sql`
- `check_in_appointment(uuid)` — security **invoker** (RLS still enforced on every write), explicit `reception.checkin` permission check, org scoping, status validation, idempotent existing-encounter return, `unique_violation` race handler. Granted to `authenticated` only.
- New permissions `queue.clinical`, `queue.override`; granted: doctor → clinical; organization_admin → both.
- `queue_entries` += `consult_started_by/at`, `consult_completed_by/at`, `completion_override_reason`.

## 4. Production data findings (read-only diagnostic, run 2026-11-23)

Orphaned `checked_in` appointments (status `checked_in`, no encounter/queue):

| Appointment | Status | Finding |
|---|---|---|
| `55e22d54-3c6b-4f1c-93f9-2dd6ae85a954` | checked_in | **ORPHAN** — no encounter, no queue entry |
| `2b8e50aa-…` | checked_in | OK — encounter + queue entry exist (healed earlier) |

Also informational: 3 appointments (`e5e7e647`, `0380587a` completed; `54cfe2c3` in_progress) have no encounter — historical records created before the flow fix.

**Recovery procedure (manual, do NOT auto-apply):**
```sql
-- For the orphaned checked_in appointment, run as service role / SQL editor:
select public.check_in_appointment('55e22d54-3c6b-4f1c-93f9-2dd6ae85a954');
-- Safe to run: returns existing records if an encounter was created since.
-- The 3 completed/in_progress appointments without encounters are historical;
-- decide per-record whether to backfill encounters or leave as legacy data.
```

## 5. Permission changes

| Role | Added |
|---|---|
| doctor | `queue.clinical` |
| organization_admin | `queue.clinical`, `queue.override` |

Receptionists keep `queue.manage` for operational actions (cancel) but can no longer start or complete consults. Nurses unchanged (triage only). No permissions removed.

## 6. Tests added & results

- `notification.service.test.ts` — asserts every query/update filters `recipient_patient_id` and never `recipient_email`.
- `reception.service.test.ts` — 12 tests: RPC delegation, no out-of-transaction writes, idempotent return, NotFound/Validation/Authorization mapping; assigned-clinician consult, non-assigned rejection, cross-clinician rejection, override reason requirement, override recording, unassigned-encounter block, receptionist cancellation preserved.

**Result: 20 files / 119 tests — all passing.**

## 7. Check results

| Check | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | ✅ pass |
| Lint | `npm run lint` | ✅ pass |
| Unit tests | `npm test` | ✅ 119/119 |
| Build | `npm run build` | ✅ 31 routes |

## 8. Deployment & migration instructions — ORDER MATTERS

1. **Apply both migrations in Supabase SQL Editor first** (they are additive/safe):
   - `supabase/migrations/20261125120000_notification_patient_identity.sql`
   - `supabase/migrations/20261125120100_atomic_checkin_and_clinical_queue.sql`
2. **Then push `main`** — Vercel auto-deploys. Pushing before step 1 will break check-in (missing RPC), queue transitions (missing columns), and portal notifications (missing column).
3. **Post-deploy:** run the orphan recovery query above for `55e22d54-…`.
4. Verify: book → confirm → check in → triage → queue; confirm doctor sees "Start consult" only on own patients; confirm receptionist sees no clinical buttons; check portal bell shows notifications.

## 9. Outstanding risks

- **Deploy ordering** is the main risk — mitigated only by applying migrations first.
- Notifications with unresolvable recipients (ambiguous email, no appointment metadata) stay `recipient_patient_id NULL` → invisible in portal. Count them post-backfill: `select count(*) from notifications where recipient_patient_id is null;`
- Walk-in creation (`createWalkIn`) still uses 3 non-transactional writes — same orphan risk class as F-02, out of scope; candidate for a follow-up RPC.
- `with_clinician`/`completed` for walk-ins (clinician_user_id NULL) requires supervisor override — intended, but reception staff should know walk-ins need admin/clinician assignment first.
- RLS `notifications_user_select` still permits reads by auth email for unbackfilled rows — acceptable, documented in migration.

## 10. Recommended next phase (Phase 2 plan — assessment only, not implemented)

| Finding | Proposed approach | Risk |
|---|---|---|
| F-04 appointment↔queue status sync | On queue `completed`/`cancelled`, also update linked appointment status (checked_in→completed/cancelled) inside the same service call; consider folding into the check-in/transition RPCs for atomicity. | Medium — business-rule decision on which appointment statuses map to queue outcomes. |
| F-05 queue transition race | Add `where status = <expected>` guard to `updateQueueEntry` (optimistic concurrency) or move transitions into a security-definer RPC with row locking. | Low-medium — needs care not to break the admin-client encounter sync. |
| F-06 clinician sync on encounter | When `encounters.clinician_user_id` is set/changed, reflect onto queue visibility; optionally sync appointment.clinician_user_id. | Low — mostly already consistent via appointment assignment. |
| F-10 unusable back-office roles | Grant `appointment.read` (or a dashboard-scoped read permission) to pharmacist/lab_technician/cashier/inventory_manager, or create role-appropriate landing pages. | Low — permission grant migration only. |
| F-13 duplicate walk-in patients | Match on phone+name+org before insert, or add a dedupe check in `createWalkIn`; consider unique constraint on (org, phone) where not null — needs data cleanup first. | Medium — data-quality dependent. |
| F-14 unbounded appointment queries | Add `.limit()` + date-window filters to `listAppointmentsForOrganization`; paginate staff appointments UI. | Low — straightforward. |

**Suggested order:** F-10 + F-14 (low risk, quick wins) → F-05 → F-04 → F-06 → F-13 (needs data audit).
