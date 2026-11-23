import {listDepartments, listFacilities} from "@/server/services/catalog.service";
import {StaffPageHeader} from "@/features/staff/components/staff-content";
import {StaffAccessDenied} from "@/features/staff/components/access-denied";
import {AuthorizationError} from "@/server/errors";
import {ServiceForm} from "@/features/catalog/catalog-forms";

export const metadata = {title: "Add service"};

export default async function NewServicePage({searchParams}: {searchParams: Promise<{department?: string}>}) {
  const params = await searchParams;
  let departments, facilities;
  try {
    [departments, facilities] = await Promise.all([listDepartments({status: "all", pageSize: 200}), listFacilities()]);
  } catch (error) { if (error instanceof AuthorizationError) return <StaffAccessDenied />; throw error; }
  const departmentOptions = departments.items.map((department) => ({id: department.id, name: department.name}));
  const facilityOptions = facilities.map((facility) => ({id: facility.id, name: facility.name}));
  const preselected = params.department && departmentOptions.some((department) => department.id === params.department) ? params.department : undefined;
  return <div className="staff-page">
    <StaffPageHeader eyebrow="Administration" title="Add service" description="Create a bookable service with pricing, duration and visibility." />
    <div className="staff-form-page"><ServiceForm defaultDepartmentId={preselected} departments={departmentOptions} facilities={facilityOptions} /></div>
  </div>;
}
