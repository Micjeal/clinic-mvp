import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { AuthorizationError } from "@/server/errors";
import { getSettingsContext } from "@/server/services/settings.service";
import { updateAppointmentSettingsAction } from "@/server/actions/settings.actions";

export const metadata = { title: "Booking & appointments · Settings" };

export default async function AppointmentSettingsPage() {
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
        title="Booking & appointments"
        description="Rules enforced by the online booking engine and patient self-service cancellation. Staff scheduling workflows are unaffected."
      />
      <div className="staff-form-page">
        <SettingsForm
          action={updateAppointmentSettingsAction}
          cancelHref="/staff/settings"
          sections={[
            {
              eyebrow: "Online booking",
              title: "Booking availability",
              fields: [
                { name: "online_booking_enabled", label: "Allow online appointment booking", type: "checkbox", defaultValue: s.online_booking_enabled, hint: "When off, patients cannot browse or request slots online. Walk-ins and staff booking still work." },
                { name: "booking_min_advance_minutes", label: "Minimum advance notice (minutes)", type: "number", min: 0, max: 10080, defaultValue: s.booking_min_advance_minutes, hint: "Patients cannot book slots starting sooner than this." },
                { name: "booking_max_advance_days", label: "Maximum booking window (days)", type: "number", min: 1, max: 365, defaultValue: s.booking_max_advance_days, hint: "Patients cannot book further ahead than this." },
              ],
            },
            {
              eyebrow: "Cancellation",
              title: "Patient cancellation rules",
              fields: [
                { name: "patient_cancellation_enabled", label: "Allow patients to cancel online", type: "checkbox", defaultValue: s.patient_cancellation_enabled, hint: "When off, patients must contact the clinic to cancel." },
                { name: "cancellation_cutoff_hours", label: "Cancellation cutoff (hours before start)", type: "number", min: 0, max: 168, defaultValue: s.cancellation_cutoff_hours, hint: "0 disables the cutoff. Patients cannot self-cancel inside this window." },
              ],
            },
          ]}
        />
      </div>
    </div>
  );
}
