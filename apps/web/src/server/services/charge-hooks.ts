import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertCharge } from "@/server/repositories/charge.repository";
import { logServerError } from "@/server/logging";

/**
 * Captures a charge from the standard_charges catalog for an encounter.
 * Looks up the first active charge in the given category (optionally matching name).
 * No-ops when no catalog item exists or price is 0 — charges are catalog-driven.
 */
export async function chargeFromCatalog(input: {
  organizationId: string;
  encounterId: string;
  patientId: string;
  facilityId: string | null;
  category: "consultation" | "triage" | "procedure" | "bed_day" | "registration" | "other";
  nameMatch?: string;
  quantity?: number;
  actorId?: string | null;
  sourceType: string;
  sourceId: string;
  description?: string;
}) {
  try {
    const admin = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
    let query = admin.from("standard_charges").select("name,price,currency_code")
      .eq("organization_id", input.organizationId).eq("category", input.category).eq("is_active", true);
    if (input.nameMatch) query = query.ilike("name", `%${input.nameMatch}%`);
    const { data: charge } = await query.order("created_at", { ascending: true }).limit(1).maybeSingle();
    const price = Number(charge?.price ?? 0);
    if (!charge || price <= 0) return;
    await insertCharge({
      organizationId: input.organizationId,
      encounterId: input.encounterId,
      patientId: input.patientId,
      facilityId: input.facilityId,
      chargeType: input.category === "bed_day" ? "supply" : "procedure",
      description: input.description ?? `${input.category.replace("_", " ")}: ${charge.name}`,
      quantity: input.quantity ?? 1,
      unitPrice: price,
      currencyCode: charge.currency_code ?? "UGX",
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      createdBy: input.actorId ?? null,
    });
  } catch (error) {
    logServerError("billing", "catalog-charge-failed", error, { category: input.category, sourceId: input.sourceId });
  }
}
