# Daily Summary — 2026-11-23

17 commits pushed to `main` (`93fd5c9` → `f6c81ef`). All changes auto-deploy to Vercel (`hospica.vercel.app`).

## Critical fixes — staff workflow pipeline

The reception → triage → queue → clinician flow was completely broken. Fixed end-to-end and verified live on production with real test accounts.

| Commit | Fix |
|---|---|
| `33a1809` | Check-in now creates encounter + queue entry (`waiting_triage`); doctor role granted `queue.read`/`queue.manage`; queue UI extended through `with_clinician` → `completed`; encounter status syncs on queue completion |
| `d5d890d` | Check-in/queue buttons were silently swallowing server-action errors — converted to `useActionState` with visible error/success messages + server-side error logging |
| `6817299` | Added `/api/health` endpoint reporting deployed commit SHA for deploy verification |
| `0f5b121` | Permission errors on triage/queue pages now show "Access denied" instead of crashing; hydration mismatch fixed; **full E2E verified on production** |
| `a0c5cc3` | Triage detail page crashed ("Unable to load") — inline async server action in a Server Component; extracted vitals form into a client component |

**Manual step (done by user):** applied migration `20261124120000_reception_flow_role_permissions.sql` granting `encounter.create` to receptionist and `queue.*` to doctor.

## Bug fixes

| Commit | Fix |
|---|---|
| `009bc4e` | Patient portal hid assigned doctor/location — clinician profile embeds blocked by RLS; appointment queries now use admin client after ownership check |
| `04f89bc` | Clinician assignment always failed — PostgREST `+00:00` vs `.000Z` timestamp string mismatch; now compares `Date` instants. Patient profile "saved" but never persisted — patients had no self-UPDATE RLS policy; now uses admin client with `.select()` verification |
| `4b8d704` | "Latest activity" cards overflowed/overlapped — grid `dl` had no bounded column track; added `minmax(0,1fr)` + `min-width:0` |
| `fc6ee42` + `96db93b` | Portal shortcut icon off-center — `display:block` override killed flex centering on mobile; SVG now square |
| `0beb58b` | Sidebar scrolled away with page — redesign accidentally changed `position:sticky` to `relative`; restored |

## Features

| Commit | Feature |
|---|---|
| `67e1565` | **In-app notifications** — patients notified on booking, status changes, cancellation, doctor assignment; bell + unread badge + mark-read in patient portal. Profile page now view-first with edit toggle. New migration adds `read_at`/`channel` columns (**needs SQL applied in Supabase**) |
| `7d7caae` | Quick-links dock is now **draggable** — pointer events, viewport clamped, persists in localStorage, panel auto-flips near edges, mobile becomes bottom sheet |

## UI/UX improvements

| Commit | Change |
|---|---|
| `93fd5c9` | Staff portal mobile navigation + drawer UX |
| `d0c30d4` | **Staff sidebar redesign** — grouped nav (Overview / Front office / Care / Administration), navy gradient + teal glow, active pill states, elevated account card, collapsed icon rail, accessible mobile drawer (Escape, focus return, `inert`) |
| `f6c81ef` | **Staff dashboard polish** — semantic color-toned metric cards with icon chips, fluid auto-fill grid, panel count badges, hover states on priority rows/recent cards, organization context chip |

## Verification performed

- Live production E2E: created test staff accounts, drove real browser through login → check-in → queue → triage → clinician flow
- DB-verified encounters/queue entries created correctly; healed one orphaned `checked_in` appointment
- Real-browser checks at 390px / 768px / 900px / 1440px for sidebar, dashboard, dock, profile, notifications
- `typecheck` ✅ `lint` ✅ `test` 107/107 ✅ `build` ✅ on all commits

## Outstanding items

- **Notifications migration** — run in Supabase SQL Editor if not already applied:
  ```sql
  alter table public.notifications add column read_at timestamptz, add column channel text not null default 'in_app';
  create index notifications_unread_idx on public.notifications(recipient_email) where read_at is null;
  ```
- **Web Push (Phase B)** — not started; needs VAPID keys, service worker, `push_subscriptions` table, opt-in UX
- **Email delivery** — notifications are in-app only; `channel: "email"` supported for future provider (Resend etc.)
- Untracked diagnostic scripts in `scripts/` kept for future debugging
