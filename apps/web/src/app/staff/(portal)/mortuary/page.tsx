import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getMortuaryData } from "@/server/actions/mortuary.actions";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { AuthorizationError } from "@/server/errors";
import { MortuaryWorkspace } from "@/features/mortuary/components/mortuary-workspace";
import { listOrgFacilities } from "@/server/repositories/billing.repository";

export const metadata = { title: "Mortuary" };

export default async function MortuaryPage() {
  let data;
  try {
    data = await getMortuaryData();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  const staff = await requirePermission(Permissions.MORTUARY_READ);
  const supabase = (await createClient()) as unknown as import("@supabase/supabase-js").SupabaseClient;
  const { data: patients } = await supabase.from("patients").select("id,first_name,last_name,patient_number").eq("organization_id", staff.membership.organization_id).eq("is_active", true).order("last_name").limit(500);
  const facilities = await listOrgFacilities(staff.membership.organization_id);
  return (
    <div className="staff-page">
      <StaffPageHeader eyebrow="Operations" title="Mortuary" description="Deceased register and release tracking." />
      <MortuaryWorkspace entries={data.entries as never} facilities={facilities} patients={(patients ?? []) as never} canManage={data.canManage} />
    </div>
  );
}
