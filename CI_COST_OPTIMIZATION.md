# CI/CD Cost Optimization Guide

**Date:** 2026-11-22  
**Project:** Hospica Clinic Management Platform  
**Purpose:** Reduce GitHub Actions costs while maintaining code quality

---

## Overview

To reduce GitHub Actions costs, we've modified the CI/CD pipeline to run **manually only** instead of automatically on every push or pull request. This approach saves CI minutes while still maintaining code quality through local checks.

---

## Changes Made

### 1. CI Workflow Modified

**File:** `.github/workflows/ci.yml`

**Before:**
```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

**After:**
```yaml
on:
  workflow_dispatch:  # Manual trigger only to save CI minutes
  # Uncomment below to enable automatic CI on push/PR (uses more minutes)
  # push:
  #   branches: [main, develop]
  # pull_request:
  #   branches: [main, develop]
```

**Impact:**
- CI no longer runs automatically on push or PR
- CI only runs when manually triggered from GitHub Actions
- Significantly reduces GitHub Actions minutes usage

---

### 2. Local Pre-Push Check Script

**File:** `scripts/pre-push-check.sh`

**Purpose:** Run all quality checks locally before pushing to catch issues early and avoid CI failures.

**What it checks:**
1. TypeScript compilation (`npm run typecheck`)
2. ESLint (`npm run lint`)
3. Unit tests (`npm run test`)
4. Production build (`npm run build`)

**Usage:**
```bash
./scripts/pre-push-check.sh
```

**Output:**
- ✅ Shows which checks are running
- ✅ Shows pass/fail for each check
- ✅ Stops on first failure
- ✅ Provides instructions for manual CI trigger

---

## How to Use

### Before Pushing Code

**Step 1: Run local quality checks**
```bash
./scripts/pre-push-check.sh
```

**Step 2: If all checks pass, push to GitHub**
```bash
git add .
git commit -m "Your commit message"
git push origin main
```

**Step 3: If any check fails, fix the issues and re-run**
```bash
# Fix the issues
./scripts/pre-push-check.sh  # Run again
```

---

### Running CI Manually (When Needed)

**When to run CI manually:**
- Before major releases
- After significant changes
- When you want to verify the full pipeline
- For compliance or auditing purposes

**Steps:**

1. **Go to GitHub Actions**
   - Navigate to: https://github.com/Micjeal/clinic-mvp/actions

2. **Select the CI workflow**
   - Click on "CI" in the left sidebar

3. **Run the workflow**
   - Click "Run workflow" button (top right)
   - Select the branch you want to test
   - Click "Run workflow"

4. **Monitor the run**
   - Watch the workflow execution
   - Check for any failures
   - Review logs if needed

---

## Benefits

### Cost Savings
- ✅ **Reduces GitHub Actions minutes** - No automatic runs on every push
- ✅ **Avoids unnecessary CI runs** - Only runs when explicitly needed
- ✅ **Saves money** - Especially important for private repositories

### Quality Maintenance
- ✅ **Catches issues early** - Local checks catch problems before pushing
- ✅ **Faster feedback** - Local checks are faster than CI
- ✅ **Reduced CI failures** - Fewer failed CI runs due to local verification

### Flexibility
- ✅ **Manual control** - You decide when to run CI
- ✅ **Still have CI available** - Can run when needed for important changes
- ✅ **Easy to re-enable** - Can uncomment automatic triggers if needed

---

## Re-enabling Automatic CI (If Needed)

If you need to re-enable automatic CI for a specific period or permanently:

**Edit `.github/workflows/ci.yml`:**

```yaml
name: CI

on:
  workflow_dispatch:  # Keep manual trigger
  push:              # Uncomment to enable automatic push
    branches: [main, develop]
  pull_request:      # Uncomment to enable automatic PR
    branches: [main, develop]
```

**Commit and push:**
```bash
git add .github/workflows/ci.yml
git commit -m "Re-enable automatic CI"
git push origin main
```

---

## CI Workflow Details

### What CI Runs

The CI workflow performs the following checks:

1. **Checkout code** - Gets the latest code
2. **Setup Node.js** - Installs Node.js 20 with npm cache
3. **Install dependencies** - Runs `npm ci`
4. **TypeScript check** - Runs `npm run typecheck`
5. **ESLint** - Runs `npm run lint`
6. **Unit tests** - Runs `npm run test`
7. **Production build** - Runs `npm run build`

### Environment Variables

CI uses GitHub Secrets for sensitive values:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `CLINIC_ORGANIZATION_ID`
- `CLINIC_DEFAULT_FACILITY_ID`

**Never commit secrets to the repository.**

---

## Troubleshooting

### Pre-Push Check Fails

**If TypeScript fails:**
```bash
# Check for TypeScript errors
npm run typecheck

# Fix the errors
# Common issues: missing types, incorrect imports, type mismatches
```

**If ESLint fails:**
```bash
# Check for linting errors
npm run lint

# Fix the errors
# Common issues: unused variables, formatting, import order
```

**If tests fail:**
```bash
# Check for test failures
npm run test

# Fix the failures
# Common issues: broken tests, changed behavior, missing mocks
```

**If build fails:**
```bash
# Check for build errors
npm run build

# Fix the errors
# Common issues: missing dependencies, environment variables, build config
```

### CI Workflow Fails

**Check the workflow logs:**
1. Go to GitHub Actions
2. Click on the failed workflow run
3. Review the logs for each step
4. Identify which step failed
5. Fix the issue locally
6. Push the fix
7. Re-run CI manually

---

## Best Practices

### Local Development
1. **Run pre-push check before every push**
2. **Fix all issues before pushing**
3. **Don't push broken code**
4. **Test locally first**

### CI Usage
1. **Run CI manually for major changes**
2. **Run CI before releases**
3. **Run CI for compliance/auditing**
4. **Don't abuse manual triggers** - Use them wisely

### Git Workflow
1. **Use feature branches**
2. **Test locally before merging**
3. **Review code before merging**
4. **Keep main branch stable**

---

## Cost Comparison

### Before (Automatic CI)
- Runs on every push to main/develop
- Runs on every pull request
- Can consume hundreds of minutes per month
- Costs can add up quickly for private repos

### After (Manual CI + Local Checks)
- Only runs when manually triggered
- Local checks catch most issues
- Dramatically reduces CI minutes
- Significant cost savings

---

## Support

For questions or issues:
- Review this documentation
- Check GitHub Actions logs
- Run local checks to debug
- Contact the development team

---

## Summary

This optimization reduces GitHub Actions costs while maintaining code quality through:
- Manual CI triggers only
- Local pre-push quality checks
- Faster feedback loops
- Reduced CI failures

**The approach balances cost savings with quality assurance.**
