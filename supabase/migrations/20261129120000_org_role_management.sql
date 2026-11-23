-- Organization-scoped custom roles: lets settings admins create roles and
-- assign permissions without touching shared system roles.
-- System roles (organization_id is null / is_system) remain read-only.

grant insert, update on public.roles to authenticated;
grant insert, update, delete on public.role_permissions to authenticated;

-- Roles: org admins may create and edit roles that belong to their org.
create policy roles_org_admin_insert
on public.roles for insert to authenticated
with check (
  organization_id is not null
  and is_system = false
  and private.has_permission(organization_id, 'settings.manage')
);

create policy roles_org_admin_update
on public.roles for update to authenticated
using (
  organization_id is not null
  and is_system = false
  and private.has_permission(organization_id, 'settings.manage')
)
with check (
  organization_id is not null
  and is_system = false
  and private.has_permission(organization_id, 'settings.manage')
);

-- role_permissions: writes only allowed when the parent role is an
-- org-scoped, non-system role in an org where the actor has settings.manage.
-- has_permission() is security definer, so no RLS recursion.
create policy role_permissions_org_admin_write
on public.role_permissions for all to authenticated
using (
  exists (
    select 1 from public.roles r
    where r.id = role_permissions.role_id
      and r.organization_id is not null
      and r.is_system = false
      and private.has_permission(r.organization_id, 'settings.manage')
  )
)
with check (
  exists (
    select 1 from public.roles r
    where r.id = role_permissions.role_id
      and r.organization_id is not null
      and r.is_system = false
      and private.has_permission(r.organization_id, 'settings.manage')
  )
);
