import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getAdmissionForm } from "@/server/services/ward.service";
import { AuthorizationError } from "@/server/errors";
import { AdmitForm } from "@/features/ward/components/ward-workspace";
import Link from "next/link";

export const metadata = { title: "New admission" };

export default async function NewAdmissionPage({ searchParams }: { searchParams: Promise<{ encounter?: string }> }) {
  const { encounter } = await searchParams;
  let initialPatientId = "";
  if (encounter) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
    const { data: enc } = await admin.from("encounters").select("patient_id").eq("id", encounter).maybeSingle();
    initialPatientId = enc?.patient_id ?? "";
  }
  let data;
  try {
    data = await getAdmissionForm();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  return (
    <div className="staff-page">
      <StaffPageHeader eyebrow="Inpatient" title="New admission" description="Admit a patient to a ward bed." actions={<Link className="btn btn--secondary" href="/staff/wards">← Back to wards</Link>} />
      <AdmitForm encounterId={encounter ?? ""} facilities={data.facilities as never} initialPatientId={initialPatientId} patients={data.patients as never} wards={data.wards as never} />
    </div>
  );
}
