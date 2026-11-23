import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { StaffPageHeader, StaffSection } from "@/features/staff/components/staff-content";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { AuthorizationError } from "@/server/errors";
import { getSettingsContext } from "@/server/services/settings.service";
import { updateNotificationSettingsAction } from "@/server/actions/settings.actions";

export const metadata = { title: "Notifications · Settings" };

const emailConfigured = Boolean(process.env.RESEND_API_KEY || process.env.SMTP_URL || process.env.SMTP_HOST);

export default async function NotificationSettingsPage() {
  let context;
  try {
    context = await getSettingsContext();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  const s = context.effective;

  return (
    <div className="staff-page">
      <StaffPageHeader
        eyebrow="Settings"
        title="Notifications"
        description="Control which delivery channels patients and staff can receive. Toggles take effect immediately for new notifications."
      />
      <StaffSection title="Delivery providers" eyebrow="Channels">
        <dl className="staff-settings-summary">
          <div><dt>In-app inbox</dt><dd>Available — stored in the patient portal</dd></div>
          <div><dt>Email provider</dt><dd>{emailConfigured ? "Configured" : "Not configured — emails are queued but not delivered"}</dd></div>
          <div><dt>SMS provider</dt><dd>Not configured</dd></div>
        </dl>
      </StaffSection>
      <div className="staff-form-page">
        <SettingsForm
          action={updateNotificationSettingsAction}
          cancelHref="/staff/settings"
          sections={[
            {
              eyebrow: "Channels",
              title: "Delivery channels",
              fields: [
                { name: "in_app_notifications_enabled", label: "In-app notifications", type: "checkbox", defaultValue: s.in_app_notifications_enabled, hint: "Patient portal inbox messages for appointment events." },
                { name: "email_notifications_enabled", label: "Email notifications", type: "checkbox", defaultValue: s.email_notifications_enabled, hint: "Queues email delivery. Requires a configured email provider to actually send." },
              ],
            },
            {
              eyebrow: "Reminders",
              title: "Appointment reminders",
              description: "Reminders are sent by a scheduled job into the patient's in-app inbox. They respect the in-app channel toggle above.",
              fields: [
                { name: "appointment_reminders_enabled", label: "Send appointment reminders", type: "checkbox", defaultValue: s.appointment_reminders_enabled },
                { name: "reminder_hours_before", label: "Remind hours before appointment", type: "number", min: 1, max: 168, defaultValue: s.reminder_hours_before, hint: "Each appointment is reminded once, inside this window." },
              ],
            },
          ]}
        />
      </div>
    </div>
  );
}
