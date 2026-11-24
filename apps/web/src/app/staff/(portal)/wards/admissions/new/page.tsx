import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getAdmissionForm } from "@/server/services/ward.service";
import { AuthorizationError } from "@/server/errors";
import { AdmitForm } from "@/features/ward/components/ward-workspace";
import Link from "next/link";

export const metadata = { title: "New admission" };

export default async function NewAdmissionPage() {
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
      <AdmitForm facilities={data.facilities as never} patients={data.patients as never} wards={data.wards as never} />
    </div>
  );
}
