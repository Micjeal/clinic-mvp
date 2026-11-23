import { StaffPageHeader, StaffSection } from "@/features/staff/components/staff-content";
import { SettingsCategoryGrid, type SettingsCategory } from "@/features/settings/components/settings-category-grid";
import { getSettingsContext } from "@/server/services/settings.service";

export const metadata = { title: "Settings" };

const categories: SettingsCategory[] = [
  { href: "/staff/settings/organization", title: "Organization profile", description: "Hospital name, contact details, address, emergency contact and currency.", icon: "building", keywords: "hospital clinic profile contact address currency" },
  { href: "/staff/settings/general", title: "General preferences", description: "Default date, time and locale formats used across the staff workspace.", icon: "sliders", keywords: "date time locale format language" },
  { href: "/staff/settings/appointments", title: "Booking & appointments", description: "Online booking availability, advance windows and patient cancellation rules.", icon: "calendar", keywords: "booking schedule cancellation reschedule window" },
  { href: "/staff/settings/notifications", title: "Notifications", description: "In-app and email delivery channels plus appointment reminders.", icon: "bell", keywords: "email sms reminders alerts inbox" },
  { href: "/staff/settings/branding", title: "Branding", description: "Organization logo and accent colour used across the staff portal and website.", icon: "palette", keywords: "logo colour brand appearance" },
  { href: "/staff/settings/security", title: "Security & access", description: "Authentication, password policy and staff access review information.", icon: "lock", keywords: "password session login access" },
  { href: "/staff/settings/clinical", title: "Clinical configuration", description: "Links to departments, services and workflows that shape clinical operations.", icon: "stethoscope", keywords: "clinical encounter vitals notes department hours" },
  { href: "/staff/settings/billing", title: "Billing & payments", description: "Currency, invoice and payment-method configuration status.", icon: "card", keywords: "invoice payment currency tax" },
  { href: "/staff/settings/integrations", title: "Integrations", description: "Email, SMS and storage provider status — no secrets are ever shown here.", icon: "plug", keywords: "email sms storage provider api" },
  { href: "/staff/settings/audit", title: "Audit log", description: "Who changed which setting, when, and what the previous value was.", icon: "history", keywords: "history changes audit trail" },
  { href: "/staff/settings/users", title: "Users & staff accounts", description: "Review staff membership, roles and access status.", icon: "users", keywords: "users staff accounts members" },
  { href: "/staff/settings/roles", title: "Roles & permissions", description: "System roles and the permissions each role grants.", icon: "shield", keywords: "roles permissions access rbac" },
  { href: "/staff/settings/facilities", title: "Facilities & locations", description: "Care locations, contact details, timezones and publication status.", icon: "building", keywords: "facility location timezone hours" },
  { href: "/staff/settings/localization", title: "Localization & region", description: "Organization timezone and billing currency.", icon: "globe", keywords: "timezone currency region locale" },
];

export default async function SettingsPage() {
  const { organization, effective } = await getSettingsContext();
  const updated = effective.updated_at ? new Date(effective.updated_at).toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" }) : null;

  return (
    <div className="staff-page">
      <StaffPageHeader
        eyebrow="Administration"
        title="Settings"
        description="Configure how Hospica schedules appointments, notifies patients, brands the workspace and records administrative changes."
      />
      <StaffSection title="Workspace summary" eyebrow="Overview">
        <dl className="staff-settings-summary">
          <div><dt>Organization</dt><dd>{organization.name}</dd></div>
          <div><dt>Currency</dt><dd>{organization.currency_code}</dd></div>
          <div><dt>Timezone</dt><dd>{organization.timezone}</dd></div>
          <div><dt>Online booking</dt><dd>{effective.online_booking_enabled ? "Enabled" : "Disabled"}</dd></div>
          <div><dt>In-app notifications</dt><dd>{effective.in_app_notifications_enabled ? "Enabled" : "Disabled"}</dd></div>
          <div><dt>Settings last updated</dt><dd>{updated ?? "Defaults in use"}</dd></div>
        </dl>
      </StaffSection>
      <SettingsCategoryGrid categories={categories} />
    </div>
  );
}
