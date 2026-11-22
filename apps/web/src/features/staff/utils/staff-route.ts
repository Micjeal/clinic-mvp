export function staffMembershipPath(membershipId: string, setup = false) {
  return `/staff/users/${membershipId}${setup ? "?setup=doctor" : ""}`;
}
