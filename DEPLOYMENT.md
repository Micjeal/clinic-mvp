# Hospica — Deployment Guide (Vercel + Netlify)

Hospica is a Next.js 16 app (App Router, SSR) backed by Supabase. It deploys to **Vercel** or **Netlify** — both work; pick one as primary.

---

## 1. Required environment variables

Set these in your host's dashboard (never commit them — `.env.local` is gitignored):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `SUPABASE_SECRET_KEY` | Supabase service-role key (server-only) |
| `NEXT_PUBLIC_SITE_URL` | Your production URL (used for auth redirects, metadata) |
| `CLINIC_ORGANIZATION_ID` | Organization UUID for clinic scoping |
| `CLINIC_DEFAULT_FACILITY_ID` | Default facility UUID |
| `SMS_PROVIDER` | `africastalking` or `twilio` (optional) |
| `SMS_API_KEY` / `SMS_USERNAME` / `SMS_SENDER_ID` | Africa's Talking credentials (if used) |
| `SMS_ACCOUNT_SID` / `SMS_AUTH_TOKEN` / `SMS_SENDER_ID` | Twilio credentials (if used) |

Get values from `apps/web/.env.local` locally, or your existing Vercel project env vars.

---

## 2. Supabase configuration (required for every domain)

In **Supabase → Authentication → URL Configuration**:

**Site URL:**
```
https://your-production-domain.com
```

**Redirect URLs** — add one line per domain you deploy to:
```
https://your-domain.vercel.app/**
https://your-domain.netlify.app/**
https://your-domain.vercel.app/auth/callback
https://your-domain.netlify.app/auth/callback
http://localhost:3000/auth/callback
```

Without this, login fails with "redirect URL not allowed".

---

## 3. Vercel deployment

The repo already has `vercel.json`. Vercel auto-detects Next.js.

1. Go to https://vercel.com → **Add New → Project** → import `Micjeal/clinic-mvp`
2. Framework preset: **Next.js** (auto-detected)
3. Add the env vars from section 1 (Project → Settings → Environment Variables)
4. Deploy — every push to `main` auto-deploys

> Note: Vercel Hobby accounts have deploy rate limits. If you hit "Deployment rate limited", wait ~24h or use Netlify.

---

## 4. Netlify deployment

The repo has `netlify.toml` (build + `@netlify/plugin-nextjs` for SSR support).

1. Go to https://app.netlify.com → **Add new site → Import an existing project**
2. Choose **GitHub** → select `Micjeal/clinic-mvp`
3. Branch to deploy: **`main`** (Netlify auto-detects Next.js runtime)
4. Before/after first deploy, add env vars: **Site settings → Environment variables** (same list as section 1)
5. Deploy — every push to `main` auto-deploys

`netlify.toml` contents:
```toml
[build]
  command = "npm run build"
  publish = "apps/web/.next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

> Drag-and-drop (Netlify Drop) does NOT work — it only hosts static sites; this app needs SSR/API routes.

---

## 5. Database migrations

Supabase migrations live in `supabase/migrations/`. To apply:

- **Supabase CLI:** `supabase db push` (linked project)
- **Dashboard:** Supabase → SQL Editor → paste migration SQL → Run
- Combined pending file: `supabase/PENDING_MIGRATIONS.sql` (already applied)

All current migrations have been applied. Only run **new** migration files when they're added.

---

## 6. Post-deploy checklist

- [ ] `NEXT_PUBLIC_SITE_URL` points at the live domain
- [ ] Supabase redirect URLs include the live domain
- [ ] Login works (patient `/login` and staff `/staff/login`)
- [ ] Patient can book an appointment end-to-end
- [ ] Staff dashboard loads at `/staff`
- [ ] Custom domain DNS configured (if using one)
- [ ] PWA: "Add to Home Screen" works (`manifest.ts` + `icon.svg`)

---

## 7. Local development

```bash
npm install
cp apps/web/.env.example apps/web/.env.local   # fill in values
npm run dev                                      # http://localhost:3000
```

Verify before deploying:
```bash
npm run typecheck
npm run lint
npm run build
```
