import { ShieldCheck } from "lucide-react";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { StaffPageHeader, StaffSection } from "@/features/staff/components/staff-content";
import { AuthorizationError } from "@/server/errors";
import { getSettingsContext, listSettingsRoles } from "@/server/services/settings.service";

export const metadata = { title: "Roles & permissions · Settings" };

const GROUP_ORDER = ["patient", "appointment", "encounter", "clinical", "lab", "pharmacy", "billing", "inventory", "triage", "facility", "department", "service", "staff", "settings", "organization", "audit"];

function groupKey(permission: string) {
  return permission.split(".")[0] ?? permission;
}

export default async function RolesSettingsPage() {
  let roles;
  try {
    await getSettingsContext();
    roles = await listSettingsRoles();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }

  return (
    <div className="staff-page">
      <StaffPageHeader
        eyebrow="Settings"
        title="Roles & permissions"
        description="System roles and the permissions each one grants. Permissions are enforced on the server for every request — there is no way to grant access by hiding navigation."
      />
      <div className="staff-editor-sections">
        {roles.map((role) => {
          const grouped = new Map<string, typeof role.permissions>();
          for (const permission of role.permissions) {
            const key = groupKey(permission.key);
            const list = grouped.get(key) ?? [];
            list.push(permission);
            grouped.set(key, list);
          }
          const groups = [...grouped.entries()].sort(([a], [b]) => {
            const ai = GROUP_ORDER.indexOf(a);
            const bi = GROUP_ORDER.indexOf(b);
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
          });
          return (
            <section className="staff-editor-section" key={role.id}>
              <header className="staff-editor-section__header">
                <div>
                  <p className="eyebrow">{role.is_system ? "System role" : "Organization role"}{role.role_key !== role.name.toLowerCase().replace(/\s+/g, "_") ? ` · ${role.role_key}` : ""}</p>
                  <h2>{role.name}</h2>
                </div>
                <span className="staff-catalog-badges">
                  <span className={`staff-member-status ${role.organization_id ? "is-active" : ""}`}>{role.permissions.length} permissions</span>
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
