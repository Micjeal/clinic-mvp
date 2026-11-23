import {listFacilities} from "@/server/services/catalog.service";
import {StaffPageHeader} from "@/features/staff/components/staff-content";
import {StaffAccessDenied} from "@/features/staff/components/access-denied";
import {AuthorizationError} from "@/server/errors";
import {DepartmentForm} from "@/features/catalog/catalog-forms";

export const metadata = {title: "Add department"};

export default async function NewDepartmentPage() {
  let facilities;
  try { facilities = await listFacilities(); }
  catch (error) { if (error instanceof AuthorizationError) return <StaffAccessDenied />; throw error; }
  const active = facilities.filter((facility) => facility.is_active).map((facility) => ({id: facility.id, name: facility.name}));
  return <div className="staff-page">
    <StaffPageHeader eyebrow="Administration" title="Add department" description="Create a clinical department under one of your facilities." />
    {active.length ? <div className="staff-form-page"><DepartmentForm facilities={active} /></div> : <div className="staff-empty staff-directory-empty"><h2>No active facilities</h2><p>Create and activate a facility before adding departments.</p></div>}
  </div>;
}
