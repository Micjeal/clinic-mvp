import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getPrescriptionForm } from "@/server/services/pharmacy.service";
import { AuthorizationError } from "@/server/errors";
import { PrescriptionForm } from "@/features/pharmacy/components/pharmacy-workspace";
import Link from "next/link";

export const metadata = { title: "New prescription" };

export default async function NewPrescriptionPage() {
  let data;
  try {
    data = await getPrescriptionForm();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  return (
    <div className="staff-page">
      <StaffPageHeader eyebrow="Clinical" title="New prescription" description="Prescribe medication against a patient encounter." actions={<Link className="btn btn--secondary" href="/staff/pharmacy">← Back to pharmacy</Link>} />
      <PrescriptionForm encounters={data.encounters as never} medications={data.medications as never} />
    </div>
  );
}
