import "server-only";
import { Permissions } from "@clinic/permissions";
import { NotFoundError, ValidationError } from "@/server/errors";
import { requirePermission, requireStaffPortalAccess } from "@/server/permissions/require-permission";
import * as repo from "@/server/repositories/hr.repository";

async function orgContext(permission: import("@clinic/permissions").Permission) {
  const staff = await requirePermission(permission);
  return { orgId: staff.membership.organization_id, userId: staff.user.id, membershipId: staff.membership.id };
}

export async function getRoster() {
  const { orgId } = await orgContext(Permissions.HR_READ);
  const today = new Date().toISOString().slice(0, 10);
  const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const [shifts, leave, memberships, facilities] = await Promise.all([
    repo.listShifts(orgId, today, weekAhead),
    repo.listLeaveRequests(orgId),
    repo.listMemberships(orgId),
    repo.listFacilities(orgId),
  ]);
  return { shifts, leave, memberships, facilities };
}

export async function createShift(input: { staffMembershipId: string; facilityId: string | null; shiftDate: string; startTime: string; endTime: string; roleOnDuty: string | null; notes: string | null }) {
  const { orgId } = await orgContext(Permissions.HR_MANAGE);
  if (input.endTime <= input.startTime) throw new ValidationError("End time must be after start time.");
  const membership = await repo.findMembership(input.staffMembershipId, orgId);
  if (!membership) throw new NotFoundError("Staff member not found");
  return repo.createShift({ ...input, organizationId: orgId });
}

export async function removeShift(shiftId: string) {
  const { orgId } = await orgContext(Permissions.HR_MANAGE);
  await repo.deleteShift(shiftId, orgId);
}

export async function requestLeave(input: { leaveType: string; startDate: string; endDate: string; reason: string | null }) {
  const staff = await requireStaffPortalAccess();
  const orgId = staff.membership.organization_id;
  const membershipId = staff.membership.id;
  const myMembership = await repo.findMembership(membershipId, orgId);
  if (!myMembership) throw new NotFoundError("Staff membership not found");
  if (input.endDate < input.startDate) throw new ValidationError("End date must be on or after start date.");
  return repo.createLeaveRequest({ organizationId: orgId, staffMembershipId: membershipId, leaveType: input.leaveType, startDate: input.startDate, endDate: input.endDate, reason: input.reason });
}

export async function reviewLeave(leaveId: string, decision: "approved" | "rejected", reviewNotes: string | null) {
  const { orgId, userId } = await orgContext(Permissions.HR_MANAGE);
  const leave = await repo.findLeaveRequest(leaveId, orgId);
  if (!leave) throw new NotFoundError("Leave request not found");
  if (leave.status !== "pending") throw new ValidationError("This request was already reviewed.");
  await repo.updateLeaveRequest(leaveId, orgId, { status: decision, reviewed_by: userId, reviewed_at: new Date().toISOString(), review_notes: reviewNotes });
}
