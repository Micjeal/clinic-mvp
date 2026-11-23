import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { StaffPageHeader, StaffSection } from "@/features/staff/components/staff-content";
import { AuthorizationError } from "@/server/errors";
import { getAuditContext } from "@/server/services/settings.service";
import { SettingsBackLink } from "@/features/settings/components/settings-back-link";

export const metadata = { title: "Audit log · Settings" };

const ACTION_LABELS: Record<string, string> = {
  "settings.general.update": "General preferences updated",
  "settings.appointments.update": "Booking rules updated",
  "settings.notifications.update": "Notification settings updated",
  "settings.branding.update": "Branding updated",
  "settings.branding.logo": "Logo changed",
  "settings.organization.update": "Organization profile updated",
};

function summarizeChange(before: unknown, after: unknown) {
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return "—";
  const b = before as Record<string, unknown>;
  const a = after as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])];
  const changed = keys.filter((key) => JSON.stringify(b[key]) !== JSON.stringify(a[key]));
  if (!changed.length) return "—";
  return changed.map((key) => `${key}: ${JSON.stringify(b[key] ?? null)} → ${JSON.stringify(a[key] ?? null)}`).join("; ");
}

export default async function AuditSettingsPage() {
  let context;
  try {
    context = await getAuditContext();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }

  return (
    <div className="staff-page">
      <SettingsBackLink />
      <StaffPageHeader
        eyebrow="Settings"
        title="Audit log"
        description={`Administrative changes recorded for ${context.organizationName}. Entries are written automatically and cannot be edited.`}
      />
      <StaffSection title="Configuration history" eyebrow="Recent changes">
        {context.logs.length ? (
          <div className="staff-panel-table-wrap">
            <table className="staff-table">
              <caption className="sr-only">Settings audit log</caption>
              <thead>
                <tr><th>When</th><th>Action</th><th>Entity</th><th>Change</th></tr>
              </thead>
              <tbody>
                {context.logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.created_at).toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td><strong>{ACTION_LABELS[log.action] ?? log.action}</strong></td>
                    <td>{log.entity_type}</td>
                    <td className="staff-audit-change">{summarizeChange(log.before_data, log.after_data)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="staff-empty staff-directory-empty">
            <h2>No changes recorded yet</h2>
            <p>Settings updates will appear here with who made them and what changed.</p>
          </div>
        )}
      </StaffSection>
    </div>
  );
}
