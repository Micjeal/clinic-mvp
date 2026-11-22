# Security boundaries

- Supabase Auth is the credential store; the application does not store passwords or tokens.
- `@supabase/ssr` uses the publishable key and request cookies. The Next 16 Proxy refreshes the session and protects portal/staff routes.
- `server-only` protects server clients, repositories, services, auth, and permission modules from client bundling.
- Authorization uses `staff_memberships`, `roles`, `role_permissions`, and `permissions`; it does not trust email, user metadata, frontend state, or hard-coded IDs.
- Patient ownership and organization scoping remain enforced by Supabase RLS. The web layer does not use a service-role key.
- Appointment ownership/details are immutable after creation and status transitions are checked in the service and database trigger.
- Raw database errors are mapped to safe user messages; sensitive medical data, passwords, tokens, and secrets are not logged.
