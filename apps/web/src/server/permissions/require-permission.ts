import "server-only";
import type {Permission} from "@clinic/permissions";
import {AuthorizationError} from "@/server/errors";
import {requireStaff} from "@/server/auth/require-staff";
import {hasAnyRolePermission,hasRolePermission} from "@/server/repositories/staff.repository";
export async function requirePermission(permission:Permission,organizationId?:string){const staff=await requireStaff();if(organizationId&&staff.membership.organization_id!==organizationId)throw new AuthorizationError();const allowed=await hasRolePermission(staff.membership.role_id,permission);if(!allowed)throw new AuthorizationError(`Missing permission: ${permission}`);return staff;}

export async function requireStaffPortalAccess(){const staff=await requireStaff();const allowed=await hasAnyRolePermission(staff.membership.role_id);if(!allowed)throw new AuthorizationError("This account has no staff permissions.");return staff;}
