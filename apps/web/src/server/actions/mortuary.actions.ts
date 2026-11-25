"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Permissions } from "@clinic/permissions";
import { safeServerMessage } from "@/server/errors";
import { logServerError } from "@/server/logging";
import { requirePermission } from "@/server/permissions/require-permission";
import { hasRolePermission } from "@/server/repositories/staff.repository";
import * as repo from "@/server/repositories/mortuary.repository";

async function ctx(permission: import("@clinic/permissions").Permission) {
  const staff = await requirePermission(permission);
  return { orgId: staff.membership.organization_id, userId: staff.user.id, staff };
}

export async function getMortuaryData() {
  const { orgId, staff } = await ctx(Permissions.MORTUARY_READ);
  const entries = await repo.listRegister(orgId);
  const canManage = await hasRolePermission(staff.membership.role_id, Permissions.MORTUARY_MANAGE);
  return { entries, canManage };
}

const entrySchema = z.object({
  facility_id: z.string().uuid(), patient_id: z.string().optional().or(z.literal("")),
  deceased_name: z.string().trim().min(1).max(200), age: z.string().trim().max(20).optional().or(z.literal("")),
  sex: z.string().optional().or(z.literal("")), date_of_death: z.string().min(8), time_of_death: z.string().optional().or(z.literal("")),
  cause_of_death: z.string().trim().max(500).optional().or(z.literal("")), notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function createMortuaryEntryAction(_prev: unknown, formData: FormData) {
  try {
    const input = entrySchema.parse({
      facility_id: formData.get("facility_id"), patient_id: formData.get("patient_id") || "",
      deceased_name: formData.get("deceased_name"), age: formData.get("age") || "", sex: formData.get("sex") || "",
      date_of_death: formData.get("date_of_death"), time_of_death: formData.get("time_of_death") || "",
      cause_of_death: formData.get("cause_of_death") || "", notes: formData.get("notes") || "",
    });
    const { orgId, userId } = await ctx(Permissions.MORTUARY_MANAGE);
    await repo.createEntry({
      organizationId: orgId, facilityId: input.facility_id, patientId: input.patient_id || null,
      deceasedName: input.deceased_name, age: input.age || null, sex: input.sex || null,
      dateOfDeath: input.date_of_death, timeOfDeath: input.time_of_death || null,
      causeOfDeath: input.cause_of_death || null, notes: input.notes || null, createdBy: userId,
    });
    revalidatePath("/staff/mortuary");
    return { success: true };
  } catch (error) {
    logServerError("mortuary", "entry-create-failed", error);
    return { error: safeServerMessage(error, "We couldn't register the deceased.") };
  }
}

export async function releaseMortuaryEntryAction(_prev: unknown, formData: FormData) {
  try {
    const id = z.string().uuid().parse(formData.get("entry_id"));
    const releasedTo = z.string().trim().min(1).max(200).parse(formData.get("released_to"));
    const { orgId } = await ctx(Permissions.MORTUARY_MANAGE);
    await repo.releaseEntry(id, orgId, releasedTo);
    try {
      const admin = (await import("@/lib/supabase/admin")).createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
      const { data: entry } = await admin.from("mortuary_register").select("patient_id,facility_id,admitted_at,released_at").eq("id", id).eq("organization_id", orgId).maybeSingle();
      if (entry?.patient_id) {
        const { data: openEnc } = await admin.from("encounters").select("id").eq("patient_id", entry.patient_id).eq("organization_id", orgId).in("status", ["open","on_hold"]).order("started_at", { ascending: false }).limit(1).maybeSingle();
        if (openEnc?.id) {
          const days = Math.max(1, Math.round(((entry.released_at ? new Date(entry.released_at).getTime() : Date.now()) - new Date(entry.admitted_at ?? Date.now()).getTime()) / 86400000));
          const { chargeFromCatalog } = await import("@/server/services/charge-hooks");
          await chargeFromCatalog({ organizationId: orgId, encounterId: openEnc.id, patientId: entry.patient_id, facilityId: entry.facility_id ?? null, category: "other", nameMatch: "mortuary", quantity: days, actorId: (await ctx(Permissions.MORTUARY_MANAGE)).userId, sourceType: "mortuary", sourceId: id, description: `Mortuary storage (${days} day${days === 1 ? "" : "s"})` });
        }
      }
    } catch (e) { logServerError("billing", "mortuary-charge-failed", e, { entryId: id }); }
    revalidatePath("/staff/mortuary");
    return { success: true };
  } catch (error) {
    logServerError("mortuary", "release-failed", error);
    return { error: safeServerMessage(error, "We couldn't release the entry.") };
  }
}
