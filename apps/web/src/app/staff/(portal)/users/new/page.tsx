import { StaffCreateForm } from "@/features/staff/components/staff-create-form";
import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { assertStaffManageAccess } from "@/server/actions/staff-management.actions";
import { listStaffRoles } from "@/server/repositories/staff-management.repository";
import { getPublicFacilities } from "@/server/services/facility.service";

export const metadata = { title: "Add staff" };
export default async function NewStaffPage() { const staff = await assertStaffManageAccess(); const [roles, facilities] = await Promise.all([listStaffRoles(staff.membership.organization_id), getPublicFacilities()]); return <div className="staff-page"><StaffPageHeader eyebrow="Staff" title="Add staff member" description="Create an account and assign their initial clinic access." /><div className="staff-form-page"><StaffCreateForm facilities={facilities} roles={roles} /></div></div>; }
