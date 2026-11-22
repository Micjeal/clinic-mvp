# Vercel Deployment Guide

This guide covers deploying the Clinic Platform to Vercel.

## Prerequisites

Before deploying, ensure you have:

1. **A Supabase Project** - The app is configured to use Supabase for:
   - Authentication (Auth)
   - Database (PostgreSQL)
   - Real-time subscriptions
   - Storage

2. **GitHub Repository** - Your code must be in a GitHub repository connected to Vercel

3. **Environment Variables** - You'll need Supabase credentials

4. **Vercel Account** - Free tier is sufficient for this project

## Architecture Overview

This is a monorepo using npm workspaces:

```
clinic-mvp/
├── apps/
│   └── web/          # Next.js 16 frontend (deployed to Vercel)
├── packages/
│   ├── database/      # Supabase TypeScript types
│   ├── validation/    # Zod schemas
│   ├── permissions/   # Permission constants
│   └── shared/        # Shared utilities
└── supabase/
    └── migrations/    # Database migrations
```

The Vercel deployment will only deploy the `apps/web` directory.

## Step 1: Prepare GitHub Repository

Since this project is not yet a git repository, you need to initialize it:

```bash
# Initialize git (already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit - Clinic Platform MVP"

# Create GitHub repository
gh repo create clinic-mvp --public --source=. --remote=origin

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 2: Configure Supabase

### Get Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `lophmbikvwhmfxoxvgap`
3. Navigate to **Project Settings** > **API**

You'll need:
- **Project URL**: `https://lophmbikvwhmfxoxvgap.supabase.co`
- **anon/public key**: Starts with `sb_publishable_`
- **service_role key**: Starts with `sb_secret_` (server-only, keep secret!)

### Configure Supabase Auth Settings

1. In Supabase Dashboard, go to **Authentication** > **URL Configuration**
2. Set **Site URL** to your Vercel domain (e.g., `https://your-domain.vercel.app`)
3. Add the following redirect URLs:
   - `https://your-domain.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (for local development)

### Set Organization and Facility IDs

1. In Supabase Dashboard, go to **Table Editor**
2. Find your organization record in the `organizations` table
3. Copy the UUID
4. Find your facility record in the `facilities` table
5. Copy the UUID

These will be used for:
- `CLINIC_ORGANIZATION_ID`
- `CLINIC_DEFAULT_FACILITY_ID`

## Step 3: Deploy to Vercel

### Option A: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

When prompted:
- **Link to existing project?** No
- **Project name**: `clinic-mvp` (or your preferred name)
- **In which directory is your code located?** `apps/web`
- **Want to override the settings?** No

### Option B: Using Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** > **"Project"**
3. Import your GitHub repository: `clinic-mvp`
4. Configure the project:

   **Framework Preset**: Next.js

   **Root Directory**: `apps/web`

   **Build Command**: `npm run build`

   **Output Directory**: `.next`

   **Install Command**: `npm install`

5. Add Environment Variables (see Step 4)
6. Click **"Deploy"**

## Step 4: Configure Environment Variables in Vercel

In your Vercel project settings, add the following environment variables:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://lophmbikvwhmfxoxvgap.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key | `sb_publishable_...` |
| `SUPABASE_SECRET_KEY` | Supabase service role key (server-only) | `sb_secret_...` |
| `NEXT_PUBLIC_SITE_URL` | Your production URL | `https://your-domain.vercel.app` |
| `CLINIC_ORGANIZATION_ID` | Organization UUID from Supabase | `11111111-1111-4111-8111-111111111111` |
| `CLINIC_DEFAULT_FACILITY_ID` | Default facility UUID from Supabase | `22222222-2222-4222-8222-222222222222` |

### Important Notes

- **Variables starting with `NEXT_PUBLIC_`** are exposed to the browser
- **`SUPABASE_SECRET_KEY`** is server-only and never exposed to clients
- **Never commit `.env.local`** to git (it's in `.gitignore`)
- Update `NEXT_PUBLIC_SITE_URL` after your first deployment

## Step 5: Post-Deployment Configuration

### Update Site URL

After your first deployment:

1. Copy your Vercel domain (e.g., `https://clinic-mvp.vercel.app`)
2. In Vercel Dashboard, go to **Settings** > **Environment Variables**
3. Update `NEXT_PUBLIC_SITE_URL` to your actual domain
4. Redeploy for changes to take effect

### Update Supabase Auth URL

1. Go to Supabase Dashboard > **Authentication** > **URL Configuration**
2. Update **Site URL** to your Vercel domain
3. Ensure `/auth/callback` is in the redirect URLs

### Domain Configuration (Optional)

To use a custom domain:

1. In Vercel Dashboard, go to **Settings** > **Domains**
2. Add your custom domain
3. Update DNS records as instructed by Vercel
4. Update `NEXT_PUBLIC_SITE_URL` in Vercel environment variables
5. Update Supabase Auth Site URL

## Step 6: Verify Deployment

After deployment, verify:

1. **Homepage loads** - Visit your Vercel domain
2. **Authentication works** - Try logging in with a test account
3. **Patient portal** - Ensure patient features work
4. **Staff portal** - Ensure staff features work
5. **Environment variables** - Check Vercel build logs for missing variables

## Troubleshooting

### Build Failures

- **"Module not found" errors**: Ensure `npm install` runs successfully
- **TypeScript errors**: Run `npm run typecheck` locally first
- **Missing environment variables**: Check Vercel build logs

### Runtime Errors

- **Supabase connection failed**: Verify `NEXT_PUBLIC_SUPABASE_URL` and keys
- **Auth callback fails**: Check Supabase Auth URL configuration
- **Organization/facility errors**: Verify UUIDs match database records

### Common Issues

1. **Server-side operations failing**
   - Ensure `SUPABASE_SECRET_KEY` is set (not just the publishable key)
   - Check that it's the service_role key, not the anon key

2. **Redirect loops on auth**
   - Verify Supabase Auth Site URL matches `NEXT_PUBLIC_SITE_URL`
   - Ensure `/auth/callback` is in allowed redirect URLs

3. **Workspace issues**
   - Vercel root directory must be `apps/web`
   - Build command should be `npm run build` (from root)

## Local Development

To continue local development after deployment:

```bash
# Install dependencies
npm install

# Copy environment variables (use your local .env.local)
# Do not use production secrets locally

# Run development server
npm run dev
```

Your local `.env.local` should use:
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
- Same Supabase credentials as production

## CI/CD Pipeline

Vercel automatically deploys on:
- Every push to `main` branch (production)
- Every pull request (preview deployment)

To add quality gates:

1. In Vercel Dashboard, go to **Settings** > **Git**
2. Add **Ignored Build Step**:
   ```bash
   npm run typecheck && npm run lint
   ```
3. This will fail builds if typecheck or lint fails

## Monitoring

Monitor your deployment:

1. **Vercel Dashboard** - View build logs, deployments, and metrics
2. **Supabase Dashboard** - Monitor database queries, auth events
3. **Vercel Analytics** - Track performance and user behavior (optional)

## Security Checklist

Before going live:

- [ ] Rotate `SUPABASE_SECRET_KEY` if exposed
- [ ] Enable Supabase RLS (Row Level Security) policies
- [ ] Remove test data from production database
- [ ] Set up backup for Supabase database
- [ ] Enable email verification in Supabase Auth
- [ ] Configure custom domain with SSL (Vercel provides this)
- [ ] Review Supabase API rate limits
- [ ] Set up error monitoring (e.g., Sentry, optional)

## Support

For issues:
- **Vercel**: [Vercel Support](https://vercel.com/support)
- **Supabase**: [Supabase Support](https://supabase.com/support)
- **Next.js**: [Next.js Documentation](https://nextjs.org/docs)

## Deployment Checklist

Use this checklist before each deployment:

- [ ] All tests pass locally: `npm run test`
- [ ] Typecheck passes: `npm run typecheck`
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds locally: `npm run build`
- [ ] Environment variables configured in Vercel
- [ ] Supabase Auth URL configured
- [ ] Database migrations applied to production
- [ ] No sensitive data in code
- [ ] `.env.local` not committed to git
- [ ] Git changes committed and pushed

## Rollback Procedure

If you need to rollback:

1. Go to Vercel Dashboard > **Deployments**
2. Find the previous successful deployment
3. Click **"..."** > **"Promote to Production"**

Or revert the git commit:
```bash
git revert <commit-hash>
git push
```

Vercel will automatically redeploy the reverted version.
