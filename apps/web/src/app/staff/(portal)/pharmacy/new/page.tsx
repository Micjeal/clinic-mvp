import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getPrescriptionForm } from "@/server/services/pharmacy.service";
import { AuthorizationError } from "@/server/errors";
import { PrescriptionForm } from "@/features/pharmacy/components/pharmacy-workspace";
import Link from "next/link";
import { Pill } from "lucide-react";

export const metadata = { title: "New prescription" };

export default async function NewPrescriptionPage({ searchParams }: { searchParams: Promise<{ encounter?: string }> }) {
  const { encounter } = await searchParams;
  let data;
  try {
    data = await getPrescriptionForm();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  return (
    <div className="staff-page">
      <div className="staff-page-heading staff-page-heading--doctor lab-order-heading">
        <div className="staff-doctor-avatar lab-order-heading__icon" aria-hidden="true"><Pill size={26} /></div>
        <div className="doctor-identity-copy">
          <p className="eyebrow">Clinical · Pharmacy</p>
          <h1>New prescription</h1>
          <p>Prescribe medication against a patient encounter. Charges are captured when dispensed.</p>
        </div>
        <div className="staff-page-heading__actions"><Link className="btn btn--secondary" href="/staff/pharmacy">← Back to pharmacy</Link></div>
      </div>
      <PrescriptionForm encounters={data.encounters as never} initialEncounterId={encounter ?? ""} medications={data.medications as never} stock={data.stock as never} stockItems={data.stockItems as never} />
    </div>
  );
}
