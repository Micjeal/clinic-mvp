import Link from "next/link";
import { Building2 } from "lucide-react";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { StaffPageHeader, StaffSection } from "@/features/staff/components/staff-content";
import { AuthorizationError } from "@/server/errors";
import { getSettingsContext, listSettingsFacilities } from "@/server/services/settings.service";

export const metadata = { title: "Facilities · Settings" };

export default async function FacilitiesSettingsPage() {
  let facilities;
  try {
    await getSettingsContext();
    facilities = await listSettingsFacilities();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }

  return (
    <div className="staff-page">
      <StaffPageHeader
        eyebrow="Settings"
        title="Facilities & locations"
        description="Care locations for your organization. Each facility keeps its own timezone, which scheduling uses for appointment times."
        actions={<Link className="btn" href="/staff/facilities">Manage facilities</Link>}
      />
      <StaffSection title="Locations" eyebrow="Facilities" description="Create and edit facility details, contact information and publication status in the facilities module.">
        {facilities.length ? (
          <div className="staff-panel-table-wrap">
            <table className="staff-table">
              <caption className="sr-only">Organization facilities</caption>
              <thead>
                <tr><th>Facility</th><th>Type</th><th>Location</th><th>Timezone</th><th>Status</th><th><span className="sr-only">Action</span></th></tr>
              </thead>
              <tbody>
                {facilities.map((facility) => (
                  <tr key={facility.id}>
                    <td>
                      <strong>{facility.name}</strong>
                      <small className="staff-row-substatus">{facility.code}</small>
                    </td>
                    <td>{facility.facility_type}</td>
                    <td>{[facility.city, facility.email].filter(Boolean).join(" · ") || "—"}</td>
                    <td>{facility.timezone.replace(/_/g, " ")}</td>
                    <td>
                      <span className={`staff-member-status ${facility.is_active ? "is-active" : "is-inactive"}`}>
                        {facility.is_active ? "Active" : "Inactive"}
                      </span>
                      {facility.is_active && facility.is_public ? <small className="staff-row-substatus">Public</small> : null}
                    </td>
                    <td><Link className="staff-table-action" href="/staff/facilities">Edit</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="staff-empty staff-directory-empty">
            <Building2 aria-hidden="true" />
            <h2>No facilities yet</h2>
            <p>Add your first care location to start scheduling appointments.</p>
            <Link className="btn" href="/staff/facilities/new">Add facility</Link>
          </div>
        )}
      </StaffSection>
    </div>
  );
}
