import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getImagingOrderForm } from "@/server/services/radiology.service";
import { AuthorizationError } from "@/server/errors";
import { ImagingOrderForm } from "@/features/radiology/components/radiology-workspace";
import Link from "next/link";
import { ScanLine } from "lucide-react";

export const metadata = { title: "New imaging order" };

export default async function NewImagingOrderPage({ searchParams }: { searchParams: Promise<{ encounter?: string }> }) {
  const { encounter } = await searchParams;
  let data;
  try {
    data = await getImagingOrderForm();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  return (
    <div className="staff-page">
      <div className="staff-page-heading staff-page-heading--doctor lab-order-heading">
        <div className="staff-doctor-avatar lab-order-heading__icon" aria-hidden="true"><ScanLine size={26} /></div>
        <div className="doctor-identity-copy">
          <p className="eyebrow">Clinical · Radiology</p>
          <h1>New imaging order</h1>
          <p>Order a radiology exam against a patient encounter. Charges are captured when the report is approved.</p>
        </div>
        <div className="staff-page-heading__actions"><Link className="btn btn--secondary" href="/staff/radiology">← Back to radiology</Link></div>
      </div>
      <ImagingOrderForm encounters={data.encounters as never} tests={data.tests as never} initialEncounterId={encounter ?? ""} />
    </div>
  );
}
