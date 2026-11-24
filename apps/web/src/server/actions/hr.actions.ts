"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { safeServerMessage } from "@/server/errors";
import { logServerError } from "@/server/logging";
import { createShift, removeShift, requestLeave, reviewLeave } from "@/server/services/hr.service";

const shiftSchema = z.object({
  staff_membership_id: z.string().uuid(),
  facility_id: z.string().uuid().optional().or(z.literal("")),
  shift_date: z.string().min(8),
  start_time: z.string().min(4),
  end_time: z.string().min(4),
  role_on_duty: z.string().trim().max(80).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function createShiftAction(_prev: unknown, formData: FormData) {
  try {
    const input = shiftSchema.parse(Object.fromEntries(formData));
    await createShift({
      staffMembershipId: input.staff_membership_id, facilityId: input.facility_id || null,
      shiftDate: input.shift_date, startTime: input.start_time, endTime: input.end_time,
      roleOnDuty: input.role_on_duty || null, notes: input.notes || null,
    });
    revalidatePath("/staff/hr");
    return { success: true };
  } catch (error) {
    logServerError("hr", "shift-create-failed", error);
    return { error: safeServerMessage(error, "We couldn't create the shift.") };
  }
}

export async function deleteShiftAction(shiftId: string) {
  try {
    await removeShift(shiftId);
    revalidatePath("/staff/hr");
    return { success: true };
  } catch (error) {
    logServerError("hr", "shift-delete-failed", error);
    return { error: safeServerMessage(error, "We couldn't remove the shift.") };
  }
}

const leaveSchema = z.object({
  leave_type: z.enum(["annual", "sick", "maternity", "paternity", "compassionate", "unpaid", "other"]).default("annual"),
  start_date: z.string().min(8),
  end_date: z.string().min(8),
  reason: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function requestLeaveAction(_prev: unknown, formData: FormData) {
  try {
    const input = leaveSchema.parse(Object.fromEntries(formData));
    await requestLeave({ leaveType: input.leave_type, startDate: input.start_date, endDate: input.end_date, reason: input.reason || null });
    revalidatePath("/staff/hr");
    return { success: true };
  } catch (error) {
    logServerError("hr", "leave-request-failed", error);
    return { error: safeServerMessage(error, "We couldn't submit the leave request.") };
  }
}

const reviewSchema = z.object({
  leave_id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  review_notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function reviewLeaveAction(_prev: unknown, formData: FormData) {
  try {
    const input = reviewSchema.parse(Object.fromEntries(formData));
    await reviewLeave(input.leave_id, input.decision, input.review_notes || null);
    revalidatePath("/staff/hr");
    return { success: true };
  } catch (error) {
    logServerError("hr", "leave-review-failed", error);
    return { error: safeServerMessage(error, "We couldn't review the request.") };
  }
}
