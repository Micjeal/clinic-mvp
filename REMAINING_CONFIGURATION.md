# Remaining Configuration - Hospica MVP

**Date:** 2026-11-22  
**Project:** Hospica Clinic Management Platform  
**Live Application:** https://hospica.vercel.app  
**GitHub Repository:** https://github.com/Micjeal/clinic-mvp

---

## Executive Summary

This document outlines all remaining configuration requirements before the Hospica MVP can be deployed to production. All code implementation is complete; only configuration and external service setup remain.

---

## High Priority Configuration ⚠️

### 1. Clinic Branding and Identity

**Status:** Placeholders in place, needs actual clinic details

**Required Information:**
- Clinic name
- Clinic description
- Phone number
- Email address
- Physical address
- Logo (if available)

**Files to Update:**
- `apps/web/src/config/site.ts` - Site configuration
- `apps/web/src/config/clinic.ts` - Clinic configuration

**Current State:**
```typescript
// apps/web/src/config/site.ts
export const site = {
  name: "Clinic name not configured",
  description: "Clinic information is being prepared.",
  phone: "Phone not configured",
  email: "Email not configured",
  address: "Address not configured",
} as const;
```

**Action Required:**
Replace placeholders with actual clinic information when provided by the hospital.

---

### 2. Environment Variables

**Status:** Local development configured, production needs verification

**Required Variables:**

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://lophmbikvwhmfxoxvgap.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable_key>
SUPABASE_SECRET_KEY=<secret_key>

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://hospica.vercel.app

# Clinic Configuration
CLINIC_ORGANIZATION_ID=<organization_uuid>
CLINIC_DEFAULT_FACILITY_ID=<facility_uuid>
```

**Current State:**
- `.env.local` has local development values
- `.env.production.example` has template
- Production values need to be set in Vercel dashboard

**Action Required:**
1. Verify production Supabase project credentials
2. Set environment variables in Vercel dashboard
3. Verify `NEXT_PUBLIC_SITE_URL` is `https://hospica.vercel.app`
4. Obtain real organization/facility UUIDs from Supabase

---

### 3. Supabase Auth Configuration

**Status:** Needs production configuration

**Required Settings:**

**Site URL:**
```
https://hospica.vercel.app
```

**Redirect URLs:**
```
https://hospica.vercel.app/auth/callback
https://hospica.vercel.app/forgot-password
https://hospica.vercel.app/reset-password
```

**Email Templates:**
- Confirm signup email
- Reset password email
- Change email address email

**Action Required:**
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Set Site URL to `https://hospica.vercel.app`
3. Add redirect URLs for callback, forgot-password, reset-password
4. Configure email templates if needed

---

### 4. SMTP Configuration (Email Delivery)

**Status:** Not configured

**Required For:**
- Email confirmation
- Password reset emails
- Custom notifications (when implemented)

**Options:**
1. Supabase built-in email (limited)
2. Custom SMTP provider (SendGrid, AWS SES, etc.)
3. Supabase Edge Functions with email service

**Action Required:**
1. Choose email delivery method
2. Configure SMTP credentials
3. Test email delivery
4. Update Supabase Auth email settings if using custom SMTP

---

## Medium Priority Configuration ⚠️

### 5. Notifications Database Migration

**Status:** Service created, requires database migration

**Required Table:**
```sql
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  recipient_email text not null,
  recipient_name text,
  subject text not null,
  message text not null,
  metadata jsonb default '{}',
  status text not null default 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy notifications_service_role_all on public.notifications
  for all to service_role using (true) with check (true);
```

**Action Required:**
1. Create migration file in `supabase/migrations/`
2. Test migration on development database
3. Apply migration to production database (with approval)
4. Regenerate database types

---

### 6. Vercel Project Configuration

**Status:** Partially configured

**Required Settings:**

**Root Directory:**
```
apps/web
```

**Framework:**
```
Next.js
```

**Build Command:**
```
npm run build
```

**Install Command:**
```
npm install
```

**Environment Variables:**
- Set all required variables (see section 2)
- Set for Production, Preview, and Development environments

**Action Required:**
1. Verify Root Directory is `apps/web`
2. Verify Framework is Next.js
3. Verify Build/Install commands
4. Set all environment variables
5. Test deployment

---

### 7. GitHub Repository Configuration

**Status:** Configured

**Required Settings:**

**Repository:**
```
https://github.com/Micjeal/clinic-mvp
```

**Branches:**
- `main` - Production branch
- `develop` - Development branch (optional)
- Feature branches for development

**GitHub Secrets (for CI/CD):**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
NEXT_PUBLIC_SITE_URL
CLINIC_ORGANIZATION_ID
CLINIC_DEFAULT_FACILITY_ID
```

**Action Required:**
1. Verify repository is connected to Vercel
2. Set GitHub Secrets for CI/CD
3. Configure branch protection rules (optional)
4. Verify CI/CD pipeline runs on PRs

---

## Low Priority Configuration 🟢

### 8. Performance Optimization

**Status:** Not critical for MVP

**Items:**
- Add indexes for unindexed foreign keys (15 items)
- Remove unused indexes (93 items)
- Remove duplicate index (1 item)

**Action Required:**
- Can be done post-launch
- Requires database migration
- Test on development first

---

### 9. Additional Features (Future)

**Status:** Not required for MVP

**Items:**
- Dark mode support
- High contrast mode
- Custom theme support
- Advanced animations
- Skeleton loading states
- E2E tests
- Integration tests
- SMS notifications
- In-app notifications
- Push notifications
- Appointment reminders
- Waitlist functionality
- Bulk operations

**Action Required:**
- Can be implemented in future releases
- Not blocking production deployment

---

## Configuration Checklist

### Before Production Deployment

- [ ] Clinic branding configured (name, description, contact details)
- [ ] Environment variables set in Vercel
- [ ] Supabase Auth Site URL configured
- [ ] Supabase Auth redirect URLs configured
- [ ] SMTP configured for email delivery
- [ ] Notifications table migration created and applied
- [ ] Vercel project settings verified
- [ ] GitHub Secrets configured for CI/CD
- [ ] Production build tested
- [ ] All quality checks passing

### Post-Deployment

- [ ] Verify production site loads correctly
- [ ] Test patient registration flow
- [ ] Test patient login flow
- [ ] Test appointment booking flow
- [ ] Test staff login flow
- [ ] Test staff appointment management
- [ ] Verify email delivery
- [ ] Monitor error logs
- [ ] Monitor performance

---

## Configuration Files Reference

### Environment Variables
- `.env.local` - Local development (gitignored)
- `.env.production.example` - Production template
- Vercel Dashboard - Production environment variables

### Supabase Configuration
- Supabase Dashboard - Project settings
- Supabase Dashboard - Authentication settings
- Supabase Dashboard - Database settings

### Vercel Configuration
- Vercel Dashboard - Project settings
- `vercel.json` - Build configuration
- Vercel Dashboard - Environment variables

### GitHub Configuration
- `.github/workflows/ci.yml` - CI/CD pipeline
- GitHub Secrets - Environment variables for CI
- GitHub Settings - Branch protection (optional)

---

## Support and Documentation

### Documentation Files
- `README.md` - Project overview
- `DEPLOY.md` - Deployment guide
- `MVP_COMPLETION_SUMMARY.md` - MVP completion summary
- `FEATURE_GAP_ANALYSIS.md` - Feature gap analysis
- `FEATURE_IMPLEMENTATION_REPORT.md` - Implementation report
- `SECURITY_REVIEW.md` - Security review
- `TESTING_REPORT.md` - Testing report
- `REMAINING_CONFIGURATION.md` - This file

### Phase Reports
- `PHASE_0_AUDIT.md` - Baseline audit
- `PHASE_2_REPORT.md` - Patient authentication
- `PHASE_3_REPORT.md` - Appointment lifecycle
- `PHASE_4_REPORT.md` - Staff appointment management
- `PHASE_5_REPORT.md` - Supabase security
- `PHASE_6_REPORT.md` - Testing and release readiness
- `PHASE_4_APPOINTMENT_REPORT.md` - Appointment management
- `PHASE_5_STAFF_DASHBOARD_REPORT.md` - Staff dashboard
- `PHASE_6_NOTIFICATIONS_REPORT.md` - Notifications
- `PHASE_7_SECURITY_REPORT.md` - Security validation
- `PHASE_8_TESTING_REPORT.md` - Testing and CI/CD
- `PHASE_9_UX_REPORT.md` - UX and responsiveness

---

## Conclusion

All code implementation is complete. The Hospica MVP is ready for production deployment pending the configuration items outlined above. The most critical configuration items are:

1. **Clinic branding** - Needs actual clinic details
2. **Environment variables** - Needs production values
3. **Supabase Auth** - Needs production URL configuration
4. **SMTP** - Needs email delivery configuration
5. **Notifications table** - Needs database migration

**Once these items are configured, the application will be fully production-ready.**
