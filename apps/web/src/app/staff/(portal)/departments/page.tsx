import Link from "next/link";
import {Plus} from "lucide-react";
import {getDepartmentStats, listDepartments, listFacilities} from "@/server/services/catalog.service";
import {StaffPageHeader} from "@/features/staff/components/staff-content";
import {StaffAccessDenied} from "@/features/staff/components/access-denied";
import {AuthorizationError} from "@/server/errors";
import {StatusBadge, CatalogPagination, CatalogEmpty, CatalogStats} from "@/features/catalog/catalog-ui";

export const metadata = {title: "Departments"};

export default async function DepartmentsPage({searchParams}: {searchParams: Promise<{search?: string; facility?: string; status?: string; page?: string}>}) {
  const params = await searchParams;
  let result, facilities, stats;
  try {
    [result, facilities, stats] = await Promise.all([
      listDepartments({
        facilityId: params.facility || undefined,
        status: params.status === "active" || params.status === "inactive" ? params.status : "all",
        search: params.search,
        page: Math.max(1, Number(params.page) || 1),
        pageSize: 25,
      }),
      listFacilities(),
      getDepartmentStats(),
    ]);
  } catch (error) { if (error instanceof AuthorizationError) return <StaffAccessDenied />; throw error; }

  return <div className="staff-page">
    <StaffPageHeader
      eyebrow="Administration"
      title="Departments"
      description="Manage clinical departments, their facilities, visibility and ordering."
      actions={<Link className="btn" href="/staff/departments/new"><Plus aria-hidden="true" />Add department</Link>}
    />
    <CatalogStats items={[
      {label: "Total departments", value: stats.total},
      {label: "Active", value: stats.active},
      {label: "Publicly visible", value: stats.public, hint: "shown on the website"},
      {label: "Facilities", value: facilities.length},
    ]} />
    <form className="staff-directory-filters" method="get">
      <label className="staff-directory-search"><span className="sr-only">Search departments</span><input name="search" placeholder="Search name or code" type="search" defaultValue={params.search ?? ""} /></label>
      <label><span className="sr-only">Facility</span><select name="facility" defaultValue={params.facility ?? ""}><option value="">All facilities</option>{facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}</select></label>
      <label><span className="sr-only">Status</span><select name="status" defaultValue={params.status ?? "all"}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
      <button className="btn btn-secondary" type="submit">Filter</button>
    </form>
    {result.items.length ? <div className="staff-panel"><div className="staff-panel-table-wrap"><table className="staff-table">
      <caption className="sr-only">Departments</caption>
      <thead><tr><th>Department</th><th>Facility</th><th>Order</th><th>Status</th><th><span className="sr-only">Action</span></th></tr></thead>
      <tbody>{result.items.map((department) => <tr key={department.id}>
        <td><strong>{department.name}</strong><small className="staff-row-substatus">{department.code}</small></td>
        <td>{department.facility_name ?? "—"}</td>
        <td>{department.sort_order}</td>
        <td><StatusBadge active={department.is_active} public={department.is_public} /></td>
        <td><Link className="staff-table-action" href={`/staff/departments/${department.id}`}>Manage</Link></td>
      </tr>)}</tbody>
    </table></div></div> : <CatalogEmpty title={result.total ? "No departments found" : "No departments yet"} description={result.total ? "Try changing the search or filters." : "Add your first department under a facility."} action={!result.total ? <Link className="btn" href="/staff/departments/new"><Plus aria-hidden="true" />Add department</Link> : null} />}
    <CatalogPagination basePath="/staff/departments" page={result.page} pageSize={result.pageSize} params={{search: params.search ?? "", facility: params.facility ?? "", status: params.status ?? "all"}} total={result.total} />
  </div>;
}
