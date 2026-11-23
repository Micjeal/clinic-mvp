import { Mail, MessageSquare, HardDrive } from "lucide-react";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { StaffPageHeader, StaffSection } from "@/features/staff/components/staff-content";
import { AuthorizationError } from "@/server/errors";
import { getSettingsContext } from "@/server/services/settings.service";
import { SettingsBackLink } from "@/features/settings/components/settings-back-link";

export const metadata = { title: "Integrations · Settings" };

const emailConfigured = Boolean(process.env.RESEND_API_KEY || process.env.SMTP_URL || process.env.SMTP_HOST);
const smsConfigured = Boolean(process.env.TWILIO_ACCOUNT_SID || process.env.AFRICASTALKING_API_KEY);

export default async function IntegrationsSettingsPage() {
  let context;
  try {
    context = await getSettingsContext();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }

  const integrations = [
    { icon: Mail, name: "Email delivery", status: emailConfigured ? "Configured" : "Not configured", detail: emailConfigured ? "Provider credentials are present in the deployment environment." : "Appointment emails are queued as pending until an email provider (e.g. Resend or SMTP) is configured." },
    { icon: MessageSquare, name: "SMS delivery", status: smsConfigured ? "Configured" : "Not configured", detail: smsConfigured ? "SMS provider credentials are present." : "No SMS provider is connected. SMS notifications are not sent." },
    { icon: HardDrive, name: "File storage", status: "Active", detail: "Supabase Storage hosts clinician photos and the organization logo." },
  ];

  return (
    <div className="staff-page">
      <SettingsBackLink />
      <StaffPageHeader
        eyebrow="Settings"
        title="Integrations"
        description="External service connection status. Secrets are never displayed — only whether a provider is configured."
      />
      <div className="staff-settings-integrations">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          return (
            <article className="staff-panel staff-integration-card" key={integration.name}>
              <span className="staff-settings-card__icon"><Icon aria-hidden="true" /></span>
              <div>
                <strong>{integration.name}</strong>
                <p>{integration.detail}</p>
              </div>
              <span className={`staff-member-status ${integration.status === "Active" || integration.status === "Configured" ? "is-active" : "is-inactive"}`}>{integration.status}</span>
            </article>
          );
        })}
      </div>
      <StaffSection title="Data management" eyebrow="Exports & backups">
        <dl className="staff-settings-summary">
          <div><dt>Self-service export</dt><dd>Not available in this workspace</dd></div>
          <div><dt>Backups</dt><dd>Managed by Supabase — see your Supabase project backup settings</dd></div>
        </dl>
      </StaffSection>
    </div>
  );
}
