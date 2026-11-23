import { ShieldCheck } from "lucide-react";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { StaffPageHeader, StaffSection } from "@/features/staff/components/staff-content";
import { CreateRoleForm, RoleEditorForm } from "@/features/settings/components/role-editor";
import { AuthorizationError } from "@/server/errors";
import { getSettingsContext, listSettingsPermissions, listSettingsRoles } from "@/server/services/settings.service";
import { createRoleAction, updateRolePermissionsAction } from "@/server/actions/settings.actions";
import { SettingsBackLink } from "@/features/settings/components/settings-back-link";

export const metadata = { title: "Roles & permissions · Settings" };

const GROUP_ORDER = ["patient", "appointment", "encounter", "clinical", "lab", "pharmacy", "billing", "inventory", "triage", "facility", "department", "service", "staff", "settings", "organization", "audit"];

function groupKey(permission: string) {
  return permission.split(".")[0] ?? permission;
}

function groupedPermissions(permissions: { key: string; description: string | null }[]) {
  const grouped = new Map<string, { key: string; description: string | null }[]>();
  for (const permission of permissions) {
    const key = groupKey(permission.key);
    const list = grouped.get(key) ?? [];
    list.push(permission);
    grouped.set(key, list);
  }
  return [...grouped.entries()].sort(([a], [b]) => {
    const ai = GROUP_ORDER.indexOf(a);
    const bi = GROUP_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

export default async function RolesSettingsPage() {
  let roles;
  let catalog;
  try {
    await getSettingsContext();
    [roles, catalog] = await Promise.all([listSettingsRoles(), listSettingsPermissions()]);
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }

  const catalogItems = catalog.map((permission) => ({ key: permission.permission_key, description: permission.description }));
  const systemRoles = roles.filter((role) => role.organization_id === null || role.is_system);
  const orgRoles = roles.filter((role) => role.organization_id !== null && !role.is_system);

  return (
    <div className="staff-page">
      <SettingsBackLink />
      <StaffPageHeader
        eyebrow="Settings"
        title="Roles & permissions"
        description="System roles are shared and read-only. Create organization roles and assign exactly the permissions each role needs — enforced on the server for every request."
        actions={<CreateRoleForm action={createRoleAction} permissions={catalogItems} />}
      />
      <div className="staff-editor-sections">
        {orgRoles.map((role) => (
          <section className="staff-editor-section" key={role.id}>
            <header className="staff-editor-section__header">
              <div>
                <p className="eyebrow">Organization role</p>
                <h2>{role.name}</h2>
                {role.description ? <p className="staff-section-description">{role.description}</p> : null}
              </div>
              <span className="staff-catalog-badges">
                <span className="staff-member-status is-active">{role.permissions.length} permissions</span>
              </span>
            </header>
            <RoleEditorForm
              action={updateRolePermissionsAction}
              initialDescription={role.description}
              initialName={role.name}
              initialPermissions={role.permissions.map((permission) => permission.key)}
              permissions={catalogItems}
              roleId={role.id}
            />
          </section>
        ))}
        {systemRoles.map((role) => {
          const groups = groupedPermissions(role.permissions);
          return (
            <section className="staff-editor-section" key={role.id}>
              <header className="staff-editor-section__header">
                <div>
                  <p className="eyebrow">System role · read-only</p>
                  <h2>{role.name}</h2>
                </div>
                <span className="staff-catalog-badges">
                  <span className="staff-member-status">{role.permissions.length} permissions</span>
                </span>
              </header>
              {role.permissions.length ? (
                <div className="staff-roles-groups">
                  {groups.map(([group, permissions]) => (
                    <div className="staff-roles-group" key={group}>
                      <h3>{group.replace(/_/g, " ")}</h3>
                      <ul>
                        {permissions.map((permission) => (
                          <li key={permission.key} title={permission.description ?? permission.key}>
                            <ShieldCheck aria-hidden="true" />
                            <code>{permission.key}</code>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="staff-settings-hint">This role grants no permissions.</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
