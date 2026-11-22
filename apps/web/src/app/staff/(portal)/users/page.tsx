import { assertStaffManageAccess } from "@/server/actions/staff-management.actions";
import { getClinicianManagementData, listStaffDirectory } from "@/server/repositories/staff-management.repository";
import { StaffDirectory } from "@/features/staff/components/staff-directory";

export const metadata = { title: "Staff" };

export default async function StaffUsersPage() {
  const staff = await assertStaffManageAccess();
  const members = await listStaffDirectory(staff.membership.organization_id);
  const doctors = await Promise.all(members.filter((member) => member.role_key === "doctor").map(async (member) => ({ id: member.id, profile: (await getClinicianManagementData(member.id, staff.membership.organization_id)).profile })));
  const doctorById = Object.fromEntries(doctors.map((item) => [item.id, item.profile]));
  return <div className="staff-page"><StaffDirectory doctorById={doctorById} members={members} /></div>;
}
