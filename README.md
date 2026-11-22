# Clinic Platform

Long-term healthcare platform foundation built on the existing Supabase project `lophmbikvwhmfxoxvgap`. The current product scope remains the public medical website, patient authentication and portal, appointment requests/cancellation, and minimal staff appointment management. Future clinical and hospital modules are intentionally not implemented.

## Architecture

The repository is an npm workspace:

```text
apps/web                 Next.js presentation and internal server runtime
packages/database        Generated Supabase TypeScript types
packages/validation      Domain Zod schemas
packages/permissions     Shared permission constants
packages/shared          Small framework-neutral helpers
supabase/migrations      Existing and release hardening migrations
docs                     Architecture and security decisions
```

Inside `apps/web/src`, dependencies flow from routes/components to Server Actions, services, repositories, and finally Supabase. Pages compose services; components do not query the database; repositories are the normal location for direct table operations. Sensitive server modules use `server-only`.

## Setup

From the repository root:

```bash
npm.cmd install
npm.cmd run dev
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

The web workspace uses:

```env
NEXT_PUBLIC_SUPABASE_URL=https://lophmbikvwhmfxoxvgap.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

The publishable key is the only Supabase key used by the web app. Never add a service-role/secret key to client code or a `NEXT_PUBLIC_` variable. Temporary clinic identity values are centralized in `apps/web/src/config/site.ts`.

## Current flows

Public data reads use domain services and repositories. Appointment requests use `appointment.actions.ts` → `appointment.service.ts` → repositories, with reusable validation, centralized authentication/permissions, PostgreSQL RLS, and database-side appointment hardening. Patient number generation remains PostgreSQL-owned. Staff changes require the existing membership, organization, role, and permission model.

## Deployment

Deploy the Next.js app with Vercel Root Directory set to `apps/web`, or use the root workspace scripts in a provider that supports npm workspaces. Set the three web environment variables, configure Supabase Auth Site URL and `/auth/callback`, and run the root quality gates before deployment.

## Documentation

- [Architecture](docs/architecture.md)
- [Appointments](docs/appointments.md)
- [Security](docs/security.md)
- [Database](docs/database.md)

The linked Supabase project currently has no clinic seed records. Add real organizations, facilities, departments, services, and controlled test accounts before live transaction acceptance. Do not create production-like fixtures as part of the structural refactor.
