import Link from "next/link";
import {notFound} from "next/navigation";
import {getFacility, listDepartments} from "@/server/services/catalog.service";
import {StaffPageHeader, StaffSection} from "@/features/staff/components/staff-content";
import {StaffAccessDenied} from "@/features/staff/components/access-denied";
import {AuthorizationError, NotFoundError} from "@/server/errors";
import {FacilityForm, ActiveToggle} from "@/features/catalog/catalog-forms";
import {StatusBadge, CatalogStats} from "@/features/catalog/catalog-ui";

export const metadata = {title: "Facility"};

export default async function FacilityDetailPage({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  let facility, departments;
  try {
    [facility, departments] = await Promise.all([getFacility(id), listDepartments({facilityId: id, status: "all", pageSize: 100})]);
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  const activeDepartments = departments.items.filter((item) => item.is_active);

  return <div className="staff-page">
    <StaffPageHeader
      eyebrow="Administration"
      title={facility.name}
      description={`${facility.code} · ${facility.facility_type}`}
      actions={<>
        <StatusBadge active={facility.is_active} public={facility.is_public} />
        <a className="btn btn-secondary" href="#facility-details">Edit details</a>
        <ActiveToggle id={facility.id} isActive={facility.is_active} kind="facility" />
      </>}
    />
    <CatalogStats items={[
      {label: "Departments", value: departments.total},
      {label: "Active departments", value: activeDepartments.length},
      {label: "Public departments", value: activeDepartments.filter((item) => item.is_public).length, hint: "visible on website"},
    ]} />
    <StaffSection title="Departments" description="Clinical departments operating at this facility.">
      {departments.items.length ? <div className="staff-panel-table-wrap"><table className="staff-table">
        <caption className="sr-only">Departments at {facility.name}</caption>
        <thead><tr><th>Name</th><th>Code</th><th>Status</th><th><span className="sr-only">Action</span></th></tr></thead>
        <tbody>{departments.items.map((department) => <tr key={department.id}>
          <td><strong>{department.name}</strong></td>
          <td>{department.code}</td>
          <td><StatusBadge active={department.is_active} public={department.is_public} /></td>
          <td><Link className="staff-table-action" href={`/staff/departments/${department.id}`}>Open</Link></td>
        </tr>)}</tbody>
      </table></div> : <p className="staff-section-description">No departments are assigned to this facility yet.</p>}
    </StaffSection>
    <StaffSection title="Facility details" description="Contact information and configuration." className="staff-catalog-edit-panel" >
      <span id="facility-details" />
      <FacilityForm facility={{
        id: facility.id, name: facility.name, code: facility.code, facility_type: facility.facility_type,
        address_line: facility.address_line, city: facility.city, district: facility.district,
        country_code: facility.country_code, phone: facility.phone, email: facility.email,
        timezone: facility.timezone, is_public: facility.is_public, is_active: facility.is_active,
      }} />
    </StaffSection>
  </div>;
}
