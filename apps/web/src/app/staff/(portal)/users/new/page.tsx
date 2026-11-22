import Link from "next/link";
import { StaffCreateForm } from "@/features/staff/components/staff-create-form";
import { assertStaffManageAccess } from "@/server/actions/staff-management.actions";
import { listStaffRoles } from "@/server/repositories/staff-management.repository";
import { getPublicFacilities } from "@/server/services/facility.service";

export const metadata = { title: "Add staff" };
export default async function NewStaffPage() { const staff = await assertStaffManageAccess(); const [roles, facilities] = await Promise.all([listStaffRoles(staff.membership.organization_id), getPublicFacilities()]); return <div className="staff-page"><Link className="staff-breadcrumb" href="/staff/users">← Staff</Link><header className="staff-page-heading staff-page-heading--editorial"><div><p className="eyebrow">Staff</p><h1>Add staff member</h1><p>Create an account and assign their initial clinic access.</p></div></header><StaffCreateForm facilities={facilities} roles={roles} /></div>; }
