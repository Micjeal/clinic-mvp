import "server-only";
import {Permissions} from "@clinic/permissions";
import {requirePermission} from "@/server/permissions/require-permission";
import {requireStaff} from "@/server/auth/require-staff";
import {getStaffDisplayContext} from "@/server/repositories/staff.repository";
import {PasswordChangeRequiredError} from "@/server/errors";

export async function getStaffPortalContext(){
  const staff=await requirePermission(Permissions.APPOINTMENT_READ);
  if(staff.membership.must_change_password)throw new PasswordChangeRequiredError();
  const details=await getStaffDisplayContext({userId:staff.user.id,organizationId:staff.membership.organization_id,roleId:staff.membership.role_id});
  return {
    userId: staff.user.id,
    name:details.profile?.full_name||staff.user.email||"Staff member",
    role:details.role?.name||staff.membership.job_title||"Staff member",
    roleKey:details.role?.role_key||"staff",
    organization:details.organization?.name||"Clinic organization",
    timezone:details.organization?.timezone||"Africa/Kampala",
    permissions:details.permissions,
  };
}

export async function getStaffPasswordSetupContext(){
  const staff=await requireStaff();
  return staff;
}
