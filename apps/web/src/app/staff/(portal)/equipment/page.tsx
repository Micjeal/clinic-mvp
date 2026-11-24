import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getEquipmentData } from "@/server/actions/equipment.actions";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { AuthorizationError } from "@/server/errors";
import { EquipmentWorkspace } from "@/features/equipment/components/equipment-workspace";
import { listOrgFacilities } from "@/server/repositories/billing.repository";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Equipment" };

export default async function EquipmentPage() {
  let data;
  try {
    data = await getEquipmentData();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  const staff = await requirePermission(Permissions.EQUIPMENT_READ);
  const supabase = (await createClient()) as unknown as import("@supabase/supabase-js").SupabaseClient;
  const [facilities, departmentsRes] = await Promise.all([
    listOrgFacilities(staff.membership.organization_id),
    supabase.from("departments").select("id,name").eq("organization_id", staff.membership.organization_id).eq("is_active", true).order("name"),
  ]);
  return (
    <div className="staff-page">
      <StaffPageHeader eyebrow="Operations" title="Equipment & maintenance" description="Assets register, service logs and downtime tracking." />
      <EquipmentWorkspace items={data.items as never} facilities={facilities} departments={(departmentsRes.data ?? []) as never} canManage={data.canManage} />
    </div>
  );
}
