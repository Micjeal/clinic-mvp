import Link from "next/link";
import {notFound} from "next/navigation";
import {ArrowLeft, Pencil} from "lucide-react";
import {getDepartmentWorkspace, listFacilities} from "@/server/services/catalog.service";
import {openingHoursToSchedule} from "@/lib/opening-hours";
import {StaffPageHeader, StaffSection} from "@/features/staff/components/staff-content";
import {StaffAccessDenied} from "@/features/staff/components/access-denied";
import {AuthorizationError, NotFoundError} from "@/server/errors";
import {DepartmentForm, DepartmentStaffManager, ActiveToggle} from "@/features/catalog/catalog-forms";
import {StatusBadge, CatalogStats} from "@/features/catalog/catalog-ui";
import {StatusChip} from "@/features/appointments/components/status-chip";

export const metadata = {title: "Department"};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-GB", {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"});
}

export default async function DepartmentWorkspacePage({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  let workspace, facilities;
  try {
    [workspace, facilities] = await Promise.all([getDepartmentWorkspace(id), listFacilities()]);
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  const {department, services, staffMembers, stats, appointments, assignableMembers, canManageStaff} = workspace;
  const hours = openingHoursToSchedule(department.opening_hours as Record<string, unknown> | null);
  const activeFacilities = facilities.filter((facility) => facility.is_active).map((facility) => ({id: facility.id, name: facility.name}));

  return <div className="staff-page">
    <StaffPageHeader
      eyebrow="Administration"
      title={department.name}
      description={`${department.code} · ${department.facility_name ?? "Facility"}`}
      actions={<>
        <Link className="btn btn-secondary" href="/staff/departments"><ArrowLeft aria-hidden="true" />All departments</Link>
        <StatusBadge active={department.is_active} public={department.is_public} />
        <ActiveToggle id={department.id} isActive={department.is_active} kind="department" />
      </>}
    />
    <CatalogStats items={[
      {label: "Services", value: services.length},
      {label: "Staff assigned", value: staffMembers.length},
      {label: "Appointments (30d)", value: stats.last30Days},
      {label: "Appointments (all)", value: stats.total},
    ]} />

    <div className="staff-catalog-workspace-grid">
      <div className="staff-catalog-workspace-main">
        <StaffSection title="Assigned staff & clinicians" description="Staff assigned to this department. The head is marked with a badge.">
          {canManageStaff
            ? <DepartmentStaffManager assignable={assignableMembers} departmentId={department.id} members={staffMembers} />
            : <p className="staff-section-description">Staff management requires the staff.manage permission.</p>}
        </StaffSection>
        <StaffSection title="Services offered" description="Services catalogued under this department." action={<Link className="btn btn-secondary" href={`/staff/services/new?department=${department.id}`}>Add service</Link>}>
          {services.length ? <ul className="staff-catalog-link-list">
            {services.map((service) => <li key={service.id}>
              <div><strong>{service.name}</strong><small>{service.code}{service.duration_minutes ? ` · ${service.duration_minutes} min` : ""}{service.base_price != null ? ` · ${service.base_price} ${service.currency_code}` : ""}</small></div>
              <span className="staff-catalog-badges"><StatusBadge active={service.is_active} public={service.is_public} /><Link className="staff-table-action" href={`/staff/services/${service.id}`}>Manage</Link></span>
            </li>)}
          </ul> : <p className="staff-section-description">No services are assigned to this department yet.</p>}
        </StaffSection>
        <StaffSection title="Recent appointments" description="Latest appointment requests for this department.">
          {appointments.length ? <div className="staff-panel-table-wrap"><table className="staff-table">
            <caption className="sr-only">Recent appointments</caption>
            <thead><tr><th>Patient</th><th>Scheduled</th><th>Status</th><th><span className="sr-only">Action</span></th></tr></thead>
            <tbody>{appointments.map((appointment) => <tr key={appointment.id}>
              <td><strong>{appointment.patient_name}</strong></td>
              <td>{formatDateTime(appointment.scheduled_start)}</td>
              <td><StatusChip status={appointment.status} /></td>
              <td><Link className="staff-table-action" href={`/staff/appointments/${appointment.id}`}>Open</Link></td>
            </tr>)}</tbody>
          </table></div> : <p className="staff-section-description">No appointments have been booked for this department yet.</p>}
        </StaffSection>
      </div>
      <aside className="staff-catalog-workspace-side">
        <StaffSection title="Department information" description="Contact details and opening hours.">
          <dl className="staff-catalog-detail-list">
            <div><dt>Phone</dt><dd>{department.phone || "—"}</dd></div>
            <div><dt>Email</dt><dd>{department.email || "—"}</dd></div>
            <div><dt>Sort order</dt><dd>{department.sort_order}</dd></div>
          </dl>
          {department.description ? <p className="staff-section-description">{department.description}</p> : null}
          <h3 className="staff-catalog-subheading">Opening hours</h3>
          {hours.length ? <ul className="staff-catalog-hours">{hours.map((item) => <li key={item.day}><span>{item.day}</span><strong>{item.windows}</strong></li>)}</ul> : <p className="staff-section-description">No opening hours configured.</p>}
        </StaffSection>
        <StaffSection title="Edit department" description="Update details, contact info and visibility.">
          <a className="btn btn-secondary" href="#department-edit"><Pencil aria-hidden="true" />Jump to edit form</a>
        </StaffSection>
      </aside>
    </div>
    <StaffSection title="Edit department" description="Changes apply to the public site immediately when the department is public." className="staff-catalog-edit-panel">
      <span id="department-edit" />
      <DepartmentForm department={{
        id: department.id, name: department.name, code: department.code, description: department.description,
        facility_id: department.facility_id, phone: department.phone, email: department.email,
        opening_hours: department.opening_hours as Record<string, unknown> | null,
        is_public: department.is_public, is_active: department.is_active, sort_order: department.sort_order,
      }} facilities={activeFacilities} />
    </StaffSection>
  </div>;
}
