export type StaffRouteAccess = "allowed" | "denied" | "login";

export function decideStaffRouteAccess(input: {
  authenticated: boolean;
  hasActiveMembership: boolean;
  permissions: readonly string[];
  requiredPermission: string;
}): StaffRouteAccess {
  if (!input.authenticated) return "login";
  if (!input.hasActiveMembership) return "denied";
  return input.permissions.includes(input.requiredPermission) ? "allowed" : "denied";
}

export function decideStaffPortalDestination(mustChangePassword:boolean):"change-password"|"staff"{
  return mustChangePassword ? "change-password" : "staff";
}
