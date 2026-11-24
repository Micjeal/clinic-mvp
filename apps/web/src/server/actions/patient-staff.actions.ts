"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Permissions } from "@clinic/permissions";
import { safeServerMessage } from "@/server/errors";
import { logServerError } from "@/server/logging";
import { requirePermission } from "@/server/permissions/require-permission";
import { createAdminClient } from "@/lib/supabase/admin";

const allergySchema = z.object({
  patient_id: z.string().uuid(),
  allergen: z.string().trim().min(1).max(120),
  reaction: z.string().trim().max(300).optional().or(z.literal("")),
  severity: z.enum(["mild", "moderate", "severe"]),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function addPatientAllergyAction(_prev: unknown, formData: FormData) {
  try {
    const input = allergySchema.parse({
      patient_id: formData.get("patient_id"),
      allergen: formData.get("allergen"),
      reaction: formData.get("reaction") || "",
      severity: formData.get("severity") || "moderate",
      notes: formData.get("notes") || "",
    });
    const staff = await requirePermission(Permissions.PATIENT_UPDATE);
    const admin = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
    const { error } = await admin.from("patient_allergies").insert({
      organization_id: staff.membership.organization_id,
      patient_id: input.patient_id,
      allergen: input.allergen,
      reaction: input.reaction || null,
      severity: input.severity,
      notes: input.notes || null,
      recorded_by: staff.user.id,
    });
    if (error) throw error;
    revalidatePath(`/staff/patients/${input.patient_id}`);
    return { success: true };
  } catch (error) {
    logServerError("patients", "allergy-add-failed", error);
    return { error: safeServerMessage(error, "We couldn't save the allergy.") };
  }
}
