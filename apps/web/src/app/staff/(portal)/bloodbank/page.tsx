import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getBloodBankData } from "@/server/actions/bloodbank.actions";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { AuthorizationError } from "@/server/errors";
import { BloodBankWorkspace } from "@/features/bloodbank/components/bloodbank-workspace";
import { listOrgFacilities } from "@/server/repositories/billing.repository";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Blood bank" };

export default async function BloodBankPage() {
  let data;
  try {
    data = await getBloodBankData();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  const staff = await requirePermission(Permissions.BLOODBANK_READ);
  const supabase = (await createClient()) as unknown as import("@supabase/supabase-js").SupabaseClient;
  const [facilities, patientsRes] = await Promise.all([
    listOrgFacilities(staff.membership.organization_id),
    supabase.from("patients").select("id,first_name,last_name,patient_number").eq("organization_id", staff.membership.organization_id).eq("is_active", true).order("last_name").limit(500),
  ]);
  return (
    <div className="staff-page">
      <StaffPageHeader eyebrow="Clinical" title="Blood bank" description="Blood unit inventory, crossmatch and transfusion records." />
      <BloodBankWorkspace units={data.units as never} transfusions={data.transfusions as never} facilities={facilities} patients={(patientsRes.data ?? []) as never} canManage={data.canManage} />
    </div>
  );
}
