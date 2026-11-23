import Link from "next/link";
import { CalendarDays, Stethoscope } from "lucide-react";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { StaffPageHeader, StaffSection } from "@/features/staff/components/staff-content";
import { AuthorizationError } from "@/server/errors";
import { getSettingsContext } from "@/server/services/settings.service";
import { SettingsBackLink } from "@/features/settings/components/settings-back-link";

export const metadata = { title: "Clinical configuration · Settings" };

export default async function ClinicalSettingsPage() {
  let context;
  try {
    context = await getSettingsContext();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }

  return (
    <div className="staff-page">
      <SettingsBackLink />
      <StaffPageHeader
        eyebrow="Settings"
        title="Clinical configuration"
        description="Clinical behaviour is configured per department and service rather than globally, so each specialty keeps its own rules."
      />
      <StaffSection title="Where clinical rules live" eyebrow="Configuration" description="These modules already enforce the clinical workflow — change them there.">
        <ul className="staff-settings-links">
          <li>
            <Stethoscope aria-hidden="true" />
            <div>
              <strong>Departments & opening hours</strong>
              <small>Opening hours gate which appointment slots are bookable; managed per department.</small>
            </div>
            <Link className="staff-table-action" href="/staff/departments">Open departments</Link>
          </li>
          <li>
            <CalendarDays aria-hidden="true" />
            <div>
              <strong>Services & durations</strong>
              <small>Service duration drives slot generation; services without a duration cannot be booked online.</small>
            </div>
            <Link className="staff-table-action" href="/staff/services">Open services</Link>
          </li>
          <li>
            <Stethoscope aria-hidden="true" />
            <div>
              <strong>Triage & encounters</strong>
              <small>Vitals, encounters and clinical notes follow the queue workflow in the portal.</small>
            </div>
            <Link className="staff-table-action" href="/staff/triage">Open triage</Link>
          </li>
        </ul>
      </StaffSection>
      <StaffSection title="Organization" eyebrow="Context">
        <dl className="staff-settings-summary">
          <div><dt>Organization</dt><dd>{context.organization.name}</dd></div>
          <div><dt>Facilities</dt><dd>{context.organization.timezone} · {context.organization.currency_code}</dd></div>
        </dl>
      </StaffSection>
    </div>
  );
}
