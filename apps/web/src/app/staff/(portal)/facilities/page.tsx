import Link from "next/link";
import {Building2, Plus} from "lucide-react";
import {listFacilities} from "@/server/services/catalog.service";
import {StaffPageHeader} from "@/features/staff/components/staff-content";
import {StaffAccessDenied} from "@/features/staff/components/access-denied";
import {AuthorizationError} from "@/server/errors";
import {StatusBadge, CatalogPagination, CatalogEmpty, CatalogStats} from "@/features/catalog/catalog-ui";
import {ActiveToggle} from "@/features/catalog/catalog-forms";

export const metadata = {title: "Facilities"};

export default async function FacilitiesPage({searchParams}: {searchParams: Promise<{search?: string; status?: string; page?: string}>}) {
  const params = await searchParams;
  let facilities;
  try { facilities = await listFacilities(); }
  catch (error) { if (error instanceof AuthorizationError) return <StaffAccessDenied />; throw error; }

  const search = (params.search ?? "").trim().toLowerCase();
  const status = params.status === "active" || params.status === "inactive" ? params.status : "all";
  const filtered = facilities.filter((facility) => {
    if (search && ![facility.name, facility.code, facility.city].filter(Boolean).join(" ").toLowerCase().includes(search)) return false;
    if (status === "active" && !facility.is_active) return false;
    if (status === "inactive" && facility.is_active) return false;
    return true;
  });
  const pageSize = 25;
  const page = Math.max(1, Number(params.page) || 1);
  const total = filtered.length;
  const items = filtered.slice((page - 1) * pageSize, page * pageSize);
  const activeCount = facilities.filter((facility) => facility.is_active).length;
  const publicCount = facilities.filter((facility) => facility.is_active && facility.is_public).length;
  const departmentTotal = facilities.reduce((sum, facility) => sum + (facility.department_count ?? 0), 0);

  return <div className="staff-page">
    <StaffPageHeader
      eyebrow="Administration"
      title="Facilities"
      description="Manage clinic locations, contact details and public visibility."
      actions={<Link className="btn" href="/staff/facilities/new"><Plus aria-hidden="true" />Add facility</Link>}
    />
    <CatalogStats items={[
      {label: "Total facilities", value: facilities.length},
      {label: "Active", value: activeCount},
      {label: "Publicly visible", value: publicCount, hint: "shown on the website"},
      {label: "Active departments", value: departmentTotal},
    ]} />
    <form className="staff-directory-filters" method="get">
      <label className="staff-directory-search"><span className="sr-only">Search facilities</span><input name="search" placeholder="Search name, code or city" type="search" defaultValue={params.search ?? ""} /></label>
      <label><span className="sr-only">Status</span><select name="status" defaultValue={status}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
      <button className="btn btn-secondary" type="submit">Filter</button>
    </form>
    {items.length ? <div className="staff-panel"><div className="staff-panel-table-wrap"><table className="staff-table">
      <caption className="sr-only">Facilities</caption>
      <thead><tr><th>Facility</th><th>Type</th><th>Location</th><th>Departments</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>{items.map((facility) => <tr key={facility.id}>
        <td><strong>{facility.name}</strong><small className="staff-row-substatus">{facility.code}</small></td>
        <td>{facility.facility_type}</td>
        <td>{[facility.city, facility.district].filter(Boolean).join(", ") || "—"}</td>
        <td>{facility.department_count ?? 0}</td>
        <td><StatusBadge active={facility.is_active} public={facility.is_public} /></td>
        <td><span className="staff-catalog-row-actions"><Link className="staff-table-action" href={`/staff/facilities/${facility.id}`}>Manage</Link><ActiveToggle id={facility.id} isActive={facility.is_active} kind="facility" /></span></td>
      </tr>)}</tbody>
    </table></div></div> : <CatalogEmpty title={facilities.length ? "No facilities found" : "No facilities yet"} description={facilities.length ? "Try changing the search or filters." : "Add your first facility to start organizing departments."} action={!facilities.length ? <Link className="btn" href="/staff/facilities/new"><Plus aria-hidden="true" />Add facility</Link> : null} />}
    <CatalogPagination basePath="/staff/facilities" page={page} pageSize={pageSize} params={{search: params.search ?? "", status}} total={total} />
  </div>;
}
