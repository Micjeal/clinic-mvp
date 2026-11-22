# Database

Supabase project reference: `lophmbikvwhmfxoxvgap`.

The database remains the source of truth. Existing migrations and RLS policies are not recreated by the web workspace. Generated public-schema types live in `packages/database/src/database.types.ts` and should be regenerated from the linked project when the schema changes.

Major existing groups include organizations and facilities, departments and services, profiles and patients, appointments, staff memberships/roles/permissions, and future clinical, laboratory, pharmacy, inventory, billing, and admission tables. Only the appointment website/staff slice is currently implemented in the web application.

The release hardening migration records the narrowly scoped appointment security changes applied to the existing project. Keep RLS enabled and use migrations for future schema changes.
