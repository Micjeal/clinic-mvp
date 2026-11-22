# First staff administrator bootstrap

SMTP is not required for the first account. Create the first Organization Admin manually in Supabase Auth, then attach one organization-scoped staff membership.

## Bootstrap steps

1. In Supabase Dashboard, open **Authentication → Users → Create user**. Use the owner's real email and a strong temporary password. Confirm the email only when appropriate for the controlled test account. Do not write the password into this repository, a database table, or a log.
2. Copy the created Auth user's UUID and verify that the existing Auth-user trigger created `public.profiles`:

   ```sql
   select id, full_name, status
   from public.profiles
   where id = '<AUTH_USER_ID>'::uuid;
   ```

3. Create one active membership for the existing TEST organization and the system `organization_admin` role. The role ID currently present in the database is `651e12aa-b9d3-4965-b434-e51eae41f26d`:

   ```sql
   insert into public.staff_memberships
     (user_id, organization_id, role_id, is_active, must_change_password, joined_at)
   values
     ('<AUTH_USER_ID>'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      '651e12aa-b9d3-4965-b434-e51eae41f26d'::uuid,
      true,
      true,
      current_date);
   ```

   This assigns **only** `organization_admin`; permissions continue to come from `role_permissions`.

4. Open `/staff/login` and sign in with the temporary password. The account must be sent to `/staff/change-password`; direct requests to `/staff` and appointment routes are redirected there too.
5. Enter the current temporary password and a private new password of at least 12 characters. After Auth accepts the update, the membership flag is cleared and the user is redirected to `/staff`.
6. Confirm the state without displaying credentials:

   ```sql
   select user_id, organization_id, role_id, is_active, must_change_password
   from public.staff_memberships
   where user_id = '<AUTH_USER_ID>'::uuid;
   ```

## Future staff provisioning

When SMTP is configured, prefer the future Organization Admin invitation flow: create the membership and controlled role/facility/department assignments server-side, send a Supabase invitation, and let the invitee create their own password. Staff must not choose their organization, role, permissions, or facility.

For controlled manual provisioning, an administrator-issued temporary password remains a fallback. Set `must_change_password = true`; never store the password outside Supabase Auth and never permit its permanent use.

The password setup update path is narrowly scoped to the current membership ID obtained after the signed-in staff check. Normal appointment and organization operations continue through the authenticated-user client, permission checks, and RLS. No service-role key is required in the browser or in this document.

The server runtime must have `SUPABASE_SERVICE_ROLE_KEY` configured for the final flag-clear step. The key is read only by `src/lib/supabase/admin.ts`, never sent to the browser, and is not used for appointment or other normal staff operations.
