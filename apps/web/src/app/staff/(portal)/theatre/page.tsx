import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getTheatreData } from "@/server/actions/theatre.actions";
import { listPatientsForSurgery } from "@/server/repositories/theatre.repository";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { AuthorizationError } from "@/server/errors";
import { TheatreWorkspace } from "@/features/theatre/components/theatre-workspace";
import { listOrgFacilities } from "@/server/repositories/billing.repository";

export const metadata = { title: "Theatre" };

export default async function TheatrePage() {
  let data;
  try {
    data = await getTheatreData();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  const staff = await requirePermission(Permissions.THEATRE_READ);
  const [patients, facilities] = await Promise.all([listPatientsForSurgery(staff.membership.organization_id), listOrgFacilities(staff.membership.organization_id)]);
  return (
    <div className="staff-page">
      <StaffPageHeader eyebrow="Clinical" title="Theatre & surgery" description="Sessions, surgical bookings and operative notes." />
      <TheatreWorkspace sessions={data.sessions as never} surgeries={data.surgeries as never} facilities={facilities} patients={patients} canManage={data.canManage} />
    </div>
  );
}
