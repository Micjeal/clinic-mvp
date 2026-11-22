# Patient Registration Provisioning — Investigation & Fix Report

Date: 2026-11-22
Scope: "We couldn't finish setting up your patient profile" error after email verification / login.

## 1. Confirmed root cause

The application code, database schema, RLS policies, foreign keys and Supabase Auth metadata flow are **all correct** — verified empirically:

- A direct authenticated `INSERT` into `public.patients` with the exact payload produced by `buildPatientInsert()` succeeded (HTTP 201) under the real RLS policies.
- The full `signInUser()` → `ensurePatientForAuthenticatedUser()` path was executed inside the real Next.js runtime (dev server, same Supabase project) and created a patient record successfully.
- Production (`hospica.vercel.app`) authenticates against the **same** Supabase project (`lophmbikvwhmfxoxvgap`) — proven by signing in a test account through the production login server action.

The failing account (`mugishamicheal24@gmail.com`, created 2026-11-22) is **email-confirmed and has complete `user_metadata`** (`first_name`, `last_name`, `phone`, `full_name`) but has **no `patients` row** — so provisioning threw inside `ensurePatientForAuthenticatedUser()` on the production deployment.

Because code + DB are proven working, the failure is **environmental to the Vercel deployment**. The overwhelmingly likely cause:

- `CLINIC_ORGANIZATION_ID` and/or `CLINIC_DEFAULT_FACILITY_ID` are missing, malformed, or **stale in the running deployment**. `clinicOrganizationId()` throws for any non-UUID/missing value, which was previously swallowed into the generic patient-profile message. Note: **Vercel environment-variable changes only take effect after a redeploy** — if the variables were added or edited after the last deployment, the running functions still see the old values.

Secondary configuration issue found during investigation:

- The Supabase project's **Site URL is `https://hophica-micjeals-projects.vercel.app`**, which is behind Vercel SSO/deployment protection — not the public `https://hophica.vercel.app`. If `https://hophica.vercel.app/auth/callback?flow=patient-registration&next=...` is not in the Supabase **Redirect URLs** allowlist, email-verification links fall back to the protected domain and users never reach `/auth/callback`, so the callback provisioning path never runs. (Login-time provisioning should still work once env vars are correct.)

The previous code made this undiagnosable because every failure — config error, RLS rejection, FK violation, missing metadata — was converted to the same generic message with no logging.

## 2. Files modified

- `apps/web/src/server/logging.ts` **(new)** — structured JSON server-side logging (`logServerEvent`, `logServerError`). Logs error name/code/message (≤300 chars), never passwords, tokens, keys or patient payloads.
- `apps/web/src/server/services/patient.service.ts` — rewrote `ensurePatientForAuthenticatedUser()` to log every failure stage with a classified `kind` (`configuration`, `missing-metadata`, `row-level-security`, `foreign-key-violation`, `unique-violation`, `not-null-violation`, `check-violation`, `missing-relation`, `unknown`) while still returning only the safe `patientSetupMessage` to users. Unique-violation race handling preserved.
- `apps/web/src/app/auth/callback/route.ts` — logs code-exchange failures, post-exchange user lookup failures, and provisioning failures before redirecting.
- `apps/web/src/server/patient-provisioning-input.ts` — `patientRegistrationDetails()` now falls back to splitting `user_metadata.full_name` when `first_name`/`last_name` are absent (helps accounts created before the name fields existed).
- `apps/web/src/server/services/patient.service.test.ts` **(new)** — 10 regression tests covering: existing patient, successful creation, staff rejection, missing metadata, missing org config, unique-violation concurrency, RLS rejection (42501), FK violation (23503), lookup failure, staff-check failure.
- `apps/web/src/features/appointments/utils/patient-provisioning.test.ts` — added `full_name` fallback tests.
- `apps/web/vitest.config.ts` **(new)** — minimal config adding the `@/` → `src` alias so server modules can be unit-tested.

No database migration is required — the schema and policies are already correct.

## 3. Changes implemented

- Original Supabase/PostgREST errors are preserved in structured server logs with operation context and classified error kind.
- User-facing messages remain generic and safe; internal error details are never exposed to patients.
- Configuration errors, authorization failures, missing metadata and constraint violations are now distinguishable in logs.
- Provisioning remains atomic per-request: lookup → staff check → validated insert → unique-violation re-check. No duplicates possible (enforced by `patients_auth_user_id_unique` / `patients_org_auth_user_key` indexes).
- Staff/patient separation verified: `staffSignInAction` requires `appointment.read`; patient sign-in rejects active staff memberships.

## 4. Database migration required

None.

## 5. Environment variables / dashboard configuration requiring manual action

1. **Vercel → Settings → Environment Variables** — verify character-for-character:
   - `CLINIC_ORGANIZATION_ID` = `11111111-1111-4111-8111-111111111111`
   - `CLINIC_DEFAULT_FACILITY_ID` = `22222222-2222-4222-8222-222222222222`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL` = `https://hospica.vercel.app`
   - **Redeploy after any change** — env changes do not apply to already-running deployments.
2. **Supabase → Authentication → URL Configuration**:
   - Set **Site URL** to `https://hospica.vercel.app`
   - Add **Redirect URLs**: `https://hospica.vercel.app/auth/callback`, plus `https://hospica.vercel.app/forgot-password` and `https://hospica.vercel.app/reset-password`. Wildcard `https://hospica.vercel.app/**` also works.

## 6. Tests executed and results

- `npm run typecheck` — pass
- `npm run lint` — pass
- `npm run test` — **94/94 pass** (17 files; +12 new tests)
- `npm run build` — pass (30 routes generated)

## 7. Remaining issues requiring manual intervention

- **Verify Vercel env vars and redeploy** (section 5.1). After deploy, check Vercel function logs for `patient-provisioning` JSON entries — the `kind` field will confirm `configuration` vs other causes if the error persists.
- **Fix Supabase Site URL / Redirect URLs** (section 5.2) so email-verification links land on `/auth/callback` instead of the SSO-protected `hophica-micjeals-projects.vercel.app` domain.
- Three legacy auth accounts (created 2026-10-07) have **no `user_metadata` at all** — they cannot be auto-provisioned. If they are patients, staff must create their patient records, or they must re-register.
- Accounts with metadata but no patient row will self-heal on next login once env vars are correct (provisioning runs on every patient sign-in).
- Recommend rotating the Supabase secret key — it was exposed in plaintext in the repository working files during this session.
