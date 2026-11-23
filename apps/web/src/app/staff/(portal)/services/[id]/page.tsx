import Link from "next/link";
import {notFound} from "next/navigation";
import {ArrowLeft} from "lucide-react";
import {getServiceWorkspace, listDepartments, listFacilities} from "@/server/services/catalog.service";
import {StaffPageHeader, StaffSection} from "@/features/staff/components/staff-content";
import {StaffAccessDenied} from "@/features/staff/components/access-denied";
import {AuthorizationError, NotFoundError} from "@/server/errors";
import {ServiceForm, ActiveToggle} from "@/features/catalog/catalog-forms";
import {StatusBadge, CatalogStats} from "@/features/catalog/catalog-ui";

export const metadata = {title: "Service"};

export default async function ServiceDetailPage({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  let workspace, departments, facilities;
  try {
    [workspace, departments, facilities] = await Promise.all([
      getServiceWorkspace(id),
      listDepartments({status: "all", pageSize: 200}),
      listFacilities(),
    ]);
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  const {service, appointmentCount} = workspace;
  const bookable = service.is_active && service.is_public && service.duration_minutes != null;

  return <div className="staff-page">
    <StaffPageHeader
      eyebrow="Administration"
      title={service.name}
      description={`${service.code} · ${service.service_type}`}
      actions={<>
        <Link className="btn btn-secondary" href="/staff/services"><ArrowLeft aria-hidden="true" />All services</Link>
        <StatusBadge active={service.is_active} public={bookable} />
        <ActiveToggle id={service.id} isActive={service.is_active} kind="service" />
      </>}
    />
    <CatalogStats items={[
      {label: "Appointments", value: appointmentCount},
      {label: "Online-bookable", value: bookable ? "Yes" : "No", hint: bookable ? undefined : "needs public + active + duration"},
      {label: "Duration", value: service.duration_minutes ? `${service.duration_minutes} min` : "—"},
      {label: "Price", value: service.base_price != null ? `${service.base_price} ${service.currency_code}` : "—"},
    ]} />
    {!bookable && service.is_public ? <p className="staff-catalog-booking-note" role="note">This service is public but cannot be booked online until a duration in minutes is set.</p> : null}
    <StaffSection title="Service details" description="Pricing, duration and catalogue placement.">
      <ServiceForm
        departments={departments.items.map((department) => ({id: department.id, name: department.name}))}
        facilities={facilities.map((facility) => ({id: facility.id, name: facility.name}))}
        service={{
          id: service.id, name: service.name, code: service.code, description: service.description,
          service_type: service.service_type, department_id: service.department_id, facility_id: service.facility_id,
          base_price: service.base_price, currency_code: service.currency_code, duration_minutes: service.duration_minutes,
          is_public: service.is_public, is_active: service.is_active,
        }}
      />
    </StaffSection>
  </div>;
}
