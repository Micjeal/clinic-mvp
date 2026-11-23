import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { AuthorizationError } from "@/server/errors";
import { getSettingsContext } from "@/server/services/settings.service";
import { updateGeneralSettingsAction } from "@/server/actions/settings.actions";

export const metadata = { title: "General preferences · Settings" };

const DATE_FORMATS = [
  { value: "d mmm yyyy", label: "23 Nov 2026" },
  { value: "yyyy-mm-dd", label: "2026-11-23" },
  { value: "dd/mm/yyyy", label: "23/11/2026" },
  { value: "mm/dd/yyyy", label: "11/23/2026" },
];

export default async function GeneralSettingsPage() {
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
        title="General preferences"
        description="Default display formats used by the staff workspace, such as the date shown in the top bar."
      />
      <div className="staff-form-page">
        <SettingsForm
          action={updateGeneralSettingsAction}
          cancelHref="/staff/settings"
          sections={[
            {
              eyebrow: "Localization",
              title: "Display formats",
              description: "These preferences apply to staff-facing date and time displays. Facility scheduling always uses each facility's own timezone.",
              fields: [
                { name: "default_date_format", label: "Date format", type: "select", defaultValue: s.default_date_format, required: true, options: DATE_FORMATS },
                { name: "default_time_format", label: "Time format", type: "select", defaultValue: s.default_time_format, required: true, options: [
                  { value: "24h", label: "24-hour (14:30)" },
                  { value: "12h", label: "12-hour (2:30 PM)" },
                ] },
                { name: "default_locale", label: "Locale", defaultValue: s.default_locale, required: true, hint: "BCP-47 locale tag, e.g. en-UG." },
              ],
            },
          ]}
        />
      </div>
    </div>
  );
}
