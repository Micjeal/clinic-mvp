import Link from "next/link";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { AuthorizationError } from "@/server/errors";
import { Permissions } from "@/server/permissions/permission.constants";
import { getSettingsContext } from "@/server/services/settings.service";
import { updateLocalizationSettingsAction } from "@/server/actions/settings.actions";

export const metadata = { title: "Localization · Settings" };

const TIMEZONES = ["Africa/Kampala", "Africa/Nairobi", "Africa/Dar_es_Salaam", "Africa/Kigali", "Africa/Addis_Ababa", "UTC"];
const CURRENCIES = ["UGX", "KES", "TZS", "RWF", "USD", "EUR"];

export default async function LocalizationSettingsPage() {
  let context;
  try {
    context = await getSettingsContext(Permissions.ORGANIZATION_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  const org = context.organization;

  return (
    <div className="staff-page">
      <StaffPageHeader
        eyebrow="Settings"
        title="Localization & region"
        description="Regional defaults for your organization: timezone for staff displays and currency for new billing records."
        actions={<Link className="staff-table-action" href="/staff/settings/general">Display formats</Link>}
      />
      <div className="staff-form-page">
        <SettingsForm
          action={updateLocalizationSettingsAction}
          cancelHref="/staff/settings"
          sections={[
            {
              eyebrow: "Region",
              title: "Timezone & currency",
              description: "The organization timezone drives staff-facing dates and times. Each facility can override it for its own scheduling. Currency applies to new invoices only — existing records keep the currency they were created with.",
              fields: [
                { name: "timezone", label: "Organization timezone", type: "select", defaultValue: org.timezone, required: true, options: TIMEZONES.map((tz) => ({ value: tz, label: tz.replace(/_/g, " ") })) },
                { name: "currency_code", label: "Currency", type: "select", defaultValue: org.currency_code, required: true, options: CURRENCIES.map((code) => ({ value: code, label: code })), hint: "ISO 4217 code used for new invoices and payments." },
              ],
            },
          ]}
        />
      </div>
    </div>
  );
}
