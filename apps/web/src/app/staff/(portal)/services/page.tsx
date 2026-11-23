import Link from "next/link";
import {Plus} from "lucide-react";
import {getServiceStats, listDepartments, listServices} from "@/server/services/catalog.service";
import {StaffPageHeader} from "@/features/staff/components/staff-content";
import {StaffAccessDenied} from "@/features/staff/components/access-denied";
import {AuthorizationError} from "@/server/errors";
import {StatusBadge, CatalogPagination, CatalogEmpty, CatalogStats} from "@/features/catalog/catalog-ui";
import {ActiveToggle} from "@/features/catalog/catalog-forms";

export const metadata = {title: "Services"};

export default async function ServicesPage({searchParams}: {searchParams: Promise<{search?: string; department?: string; status?: string; page?: string}>}) {
  const params = await searchParams;
  let result, departments, stats;
  try {
    [result, departments, stats] = await Promise.all([
      listServices({
        departmentId: params.department || undefined,
        status: params.status === "active" || params.status === "inactive" ? params.status : "all",
        search: params.search,
        page: Math.max(1, Number(params.page) || 1),
        pageSize: 25,
      }),
      listDepartments({status: "all", pageSize: 200}),
      getServiceStats(),
    ]);
  } catch (error) { if (error instanceof AuthorizationError) return <StaffAccessDenied />; throw error; }

  return <div className="staff-page">
    <StaffPageHeader
      eyebrow="Administration"
      title="Services"
      description="Manage the clinical and administrative services patients can book."
      actions={<Link className="btn" href="/staff/services/new"><Plus aria-hidden="true" />Add service</Link>}
    />
    <CatalogStats items={[
      {label: "Total services", value: stats.total},
      {label: "Active", value: stats.active},
      {label: "Online-bookable", value: stats.bookable, hint: "public, active and timed"},
      {label: "Departments", value: departments.total},
    ]} />
    <form className="staff-directory-filters" method="get">
      <label className="staff-directory-search"><span className="sr-only">Search services</span><input name="search" placeholder="Search name or code" type="search" defaultValue={params.search ?? ""} /></label>
      <label><span className="sr-only">Department</span><select name="department" defaultValue={params.department ?? ""}><option value="">All departments</option><option value="none">Organization-wide</option>{departments.items.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
      <label><span className="sr-only">Status</span><select name="status" defaultValue={params.status ?? "all"}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
      <button className="btn btn-secondary" type="submit">Filter</button>
    </form>
    {result.items.length ? <div className="staff-panel"><div className="staff-panel-table-wrap"><table className="staff-table">
      <caption className="sr-only">Services</caption>
      <thead><tr><th>Service</th><th>Type</th><th>Department</th><th>Price</th><th>Duration</th><th className="staff-col-status">Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>{result.items.map((service) => <tr key={service.id}>
        <td><strong>{service.name}</strong><small className="staff-row-substatus">{service.code}</small></td>
        <td>{service.service_type}</td>
        <td>{service.department_name ?? "—"}</td>
        <td>{service.base_price != null ? `${service.base_price} ${service.currency_code}` : "—"}</td>
        <td>{service.duration_minutes ? `${service.duration_minutes} min` : "—"}</td>
        <td><StatusBadge active={service.is_active} public={service.is_public && service.duration_minutes != null} /></td>
        <td><span className="staff-catalog-row-actions"><Link className="staff-table-action" href={`/staff/services/${service.id}`}>Manage</Link><ActiveToggle id={service.id} isActive={service.is_active} kind="service" /></span></td>
      </tr>)}</tbody>
    </table></div></div> : <CatalogEmpty title={result.total ? "No services found" : "No services yet"} description={result.total ? "Try changing the search or filters." : "Add your first service to the catalogue."} action={!result.total ? <Link className="btn" href="/staff/services/new"><Plus aria-hidden="true" />Add service</Link> : null} />}
    <CatalogPagination basePath="/staff/services" page={result.page} pageSize={result.pageSize} params={{search: params.search ?? "", department: params.department ?? "", status: params.status ?? "all"}} total={result.total} />
  </div>;
}
