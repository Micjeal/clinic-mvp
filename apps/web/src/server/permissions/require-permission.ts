import "server-only";
import type {Permission} from "@clinic/permissions";
import {AuthorizationError} from "@/server/errors";
import {requireStaff} from "@/server/auth/require-staff";
import {hasRolePermission} from "@/server/repositories/staff.repository";
export async function requirePermission(permission:Permission,organizationId?:string){const staff=await requireStaff();if(organizationId&&staff.membership.organization_id!==organizationId)throw new AuthorizationError();const allowed=await hasRolePermission(staff.membership.role_id,permission);if(!allowed)throw new AuthorizationError(`Missing permission: ${permission}`);return staff;}
