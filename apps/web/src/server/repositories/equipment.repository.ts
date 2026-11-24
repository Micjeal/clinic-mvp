import "server-only";
import { createClient } from "@/lib/supabase/server";

const untyped = async () => (await createClient()) as unknown as import("@supabase/supabase-js").SupabaseClient;
const SELECT = "*,facilities!equipment_facility_id_fkey(id,name),departments!equipment_department_id_fkey(id,name),equipment_maintenance(id,maintenance_type,performed_at,description,cost,next_due_date)";

export async function listEquipment(organizationId: string) {
  const supabase = await untyped();
  const { data, error } = await supabase.from("equipment").select(SELECT).eq("organization_id", organizationId).order("name").limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function createEquipment(input: { organizationId: string; facilityId: string | null; departmentId: string | null; name: string; category: string | null; assetTag: string | null; serialNumber: string | null; purchaseDate: string | null; warrantyExpiry: string | null; notes: string | null; createdBy: string }) {
  const supabase = await untyped();
  const { data, error } = await supabase.from("equipment").insert({
    organization_id: input.organizationId, facility_id: input.facilityId, department_id: input.departmentId,
    name: input.name, category: input.category, asset_tag: input.assetTag, serial_number: input.serialNumber,
    purchase_date: input.purchaseDate, warranty_expiry: input.warrantyExpiry, notes: input.notes, created_by: input.createdBy,
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function updateEquipmentStatus(id: string, organizationId: string, status: string) {
  const supabase = await untyped();
  const { error } = await supabase.from("equipment").update({ status }).eq("id", id).eq("organization_id", organizationId);
  if (error) throw error;
}

export async function logMaintenance(input: { organizationId: string; equipmentId: string; maintenanceType: string; performedBy: string | null; description: string; cost: number | null; nextDueDate: string | null; createdBy: string }) {
  const supabase = await untyped();
  const { error } = await supabase.from("equipment_maintenance").insert({
    organization_id: input.organizationId, equipment_id: input.equipmentId, maintenance_type: input.maintenanceType,
    performed_by: input.performedBy, description: input.description, cost: input.cost,
    next_due_date: input.nextDueDate, created_by: input.createdBy,
  });
  if (error) throw error;
}
