"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Permissions } from "@clinic/permissions";
import { safeServerMessage } from "@/server/errors";
import { logServerError } from "@/server/logging";
import { requirePermission } from "@/server/permissions/require-permission";
import { hasRolePermission } from "@/server/repositories/staff.repository";
import * as repo from "@/server/repositories/transport.repository";

async function ctx(permission: import("@clinic/permissions").Permission) {
  const staff = await requirePermission(permission);
  return { orgId: staff.membership.organization_id, userId: staff.user.id, staff };
}

export async function getTransportData() {
  const { orgId, staff } = await ctx(Permissions.TRANSPORT_READ);
  const requests = await repo.listRequests(orgId);
  const canManage = await hasRolePermission(staff.membership.role_id, Permissions.TRANSPORT_MANAGE);
  return { requests, canManage };
}

const requestSchema = z.object({
  facility_id: z.string().optional().or(z.literal("")), patient_id: z.string().optional().or(z.literal("")),
  request_type: z.enum(["pickup", "dropoff", "transfer", "emergency"]), pickup_location: z.string().trim().min(1).max(300),
  destination: z.string().trim().max(300).optional().or(z.literal("")), scheduled_at: z.string().optional().or(z.literal("")),
  priority: z.enum(["routine", "urgent", "emergency"]).optional().or(z.literal("")),
  vehicle: z.string().trim().max(60).optional().or(z.literal("")), notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function createTransportRequestAction(_prev: unknown, formData: FormData) {
  try {
    const input = requestSchema.parse({
      facility_id: formData.get("facility_id") || "", patient_id: formData.get("patient_id") || "",
      request_type: formData.get("request_type"), pickup_location: formData.get("pickup_location"),
      destination: formData.get("destination") || "", scheduled_at: formData.get("scheduled_at") || "",
      priority: formData.get("priority") || "routine", vehicle: formData.get("vehicle") || "", notes: formData.get("notes") || "",
    });
    const { orgId, userId } = await ctx(Permissions.TRANSPORT_MANAGE);
    await repo.createRequest({
      organizationId: orgId, facilityId: input.facility_id || null, patientId: input.patient_id || null,
      requestType: input.request_type, pickupLocation: input.pickup_location, destination: input.destination || null,
      scheduledAt: input.scheduled_at || null, priority: input.priority || "routine", vehicle: input.vehicle || null,
      notes: input.notes || null, createdBy: userId,
    });
    revalidatePath("/staff/transport");
    return { success: true };
  } catch (error) {
    logServerError("transport", "create-failed", error);
    return { error: safeServerMessage(error, "We couldn't create the request.") };
  }
}

export async function updateTransportRequestAction(_prev: unknown, formData: FormData) {
  try {
    const id = z.string().uuid().parse(formData.get("request_id"));
    const status = z.enum(["requested", "assigned", "en_route", "completed", "cancelled"]).parse(formData.get("status"));
    const patch: Record<string, unknown> = { status };
    const vehicle = formData.get("vehicle");
    const driver = formData.get("driver_name");
    if (typeof vehicle === "string" && vehicle.trim()) patch.vehicle = vehicle.trim();
    if (typeof driver === "string" && driver.trim()) patch.driver_name = driver.trim();
    const { orgId, userId } = await ctx(Permissions.TRANSPORT_MANAGE);
    await repo.updateRequest(id, orgId, patch);
    if (status === "completed") {
      const admin = (await import("@/lib/supabase/admin")).createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
      const { data: req } = await admin.from("transport_requests").select("patient_id,facility_id").eq("id", id).eq("organization_id", orgId).maybeSingle();
      if (req?.patient_id) {
        const { data: openEnc } = await admin.from("encounters").select("id").eq("patient_id", req.patient_id).eq("organization_id", orgId).in("status", ["open","in_progress"]).order("started_at", { ascending: false }).limit(1).maybeSingle();
        if (openEnc?.id) {
          const { chargeFromCatalog } = await import("@/server/services/charge-hooks");
          await chargeFromCatalog({ organizationId: orgId, encounterId: openEnc.id, patientId: req.patient_id, facilityId: req.facility_id ?? null, category: "other", nameMatch: "transport", quantity: 1, actorId: userId, sourceType: "transport", sourceId: id, description: "Patient transport" });
        }
      }
    }
    revalidatePath("/staff/transport");
    return { success: true };
  } catch (error) {
    logServerError("transport", "update-failed", error);
    return { error: safeServerMessage(error, "We couldn't update the request.") };
  }
}
