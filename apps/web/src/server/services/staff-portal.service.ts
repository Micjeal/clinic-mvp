import "server-only";
import {requireStaffPortalAccess} from "@/server/permissions/require-permission";
import {requireStaff} from "@/server/auth/require-staff";
import {getStaffDisplayContext} from "@/server/repositories/staff.repository";
import {findOrganizationSettings, DEFAULT_ORGANIZATION_SETTINGS} from "@/server/repositories/settings.repository";
import {PasswordChangeRequiredError} from "@/server/errors";

export async function getStaffPortalContext(){
  const staff=await requireStaffPortalAccess();
  if(staff.membership.must_change_password)throw new PasswordChangeRequiredError();
  const [details,settings]=await Promise.all([
    getStaffDisplayContext({userId:staff.user.id,organizationId:staff.membership.organization_id,roleId:staff.membership.role_id}),
    findOrganizationSettings(staff.membership.organization_id),
  ]);
  const effective={...DEFAULT_ORGANIZATION_SETTINGS,...(settings??{})};
  return {
    userId: staff.user.id,
    name:details.profile?.full_name||staff.user.email||"Staff member",
    role:details.role?.name||staff.membership.job_title||"Staff member",
    roleKey:details.role?.role_key||"staff",
    organization:details.organization?.name||"Clinic organization",
    timezone:details.organization?.timezone||"Africa/Kampala",
    permissions:details.permissions,
    brandColor:effective.brand_color,
    dateFormat:effective.default_date_format,
    timeFormat:effective.default_time_format,
    locale:effective.default_locale,
  };
}

export async function getStaffPasswordSetupContext(){
  const staff=await requireStaff();
  return staff;
}
