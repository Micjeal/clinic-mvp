import Link from "next/link";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { StaffPageHeader, StaffSection } from "@/features/staff/components/staff-content";
import { AuthorizationError } from "@/server/errors";
import { Permissions } from "@/server/permissions/permission.constants";
import { getSettingsContext, listSettingsStaff } from "@/server/services/settings.service";
import { SettingsBackLink } from "@/features/settings/components/settings-back-link";

export const metadata = { title: "Users & roles · Settings" };

export default async function UsersSettingsPage() {
  let members;
  try {
    await getSettingsContext(Permissions.STAFF_MANAGE);
    members = await listSettingsStaff();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  const active = members.filter((member) => member.is_active).length;

  return (
    <div className="staff-page">
      <SettingsBackLink />
      <StaffPageHeader
        eyebrow="Settings"
        title="Users & staff accounts"
        description="Who can sign in to the staff portal and what they can do. Role definitions are managed under Roles & permissions."
        actions={<Link className="btn" href="/staff/users/new">Add staff member</Link>}
      />
      <StaffSection
        title={`${members.length} staff member${members.length === 1 ? "" : "s"} · ${active} active`}
        eyebrow="Directory"
        description="Access is enforced server-side on every request — changing a role takes effect on the member's next action."
      >
        <div className="staff-panel-table-wrap">
          <table className="staff-table">
            <caption className="sr-only">Staff accounts</caption>
            <thead>
              <tr><th>Staff member</th><th>Role</th><th>Assignment</th><th>Status</th><th><span className="sr-only">Action</span></th></tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>
                    <strong>{member.full_name}</strong>
                    <small className="staff-row-substatus">{member.job_title || member.employee_number || "Staff member"}</small>
                  </td>
                  <td>{member.role_name}</td>
                  <td>{member.department_names.length ? member.department_names.join(", ") : member.facility_name || "Not assigned"}</td>
                  <td>
                    <span className={`staff-member-status ${member.is_active ? "is-active" : "is-inactive"}`}>
                      {member.is_active ? (member.must_change_password ? "Password setup required" : "Active") : "Inactive"}
                    </span>
                  </td>
                  <td><Link className="staff-table-action" href={`/staff/users/${member.id}`}>Manage</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StaffSection>
    </div>
  );
}
