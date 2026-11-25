import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getLabOrderForm } from "@/server/services/lab.service";
import { AuthorizationError } from "@/server/errors";
import { LabOrderForm } from "@/features/lab/components/lab-order-form";
import Link from "next/link";
import { FlaskConical } from "lucide-react";

export const metadata = { title: "New lab order" };

export default async function NewLabOrderPage({ searchParams }: { searchParams: Promise<{ encounter?: string }> }) {
  const { encounter } = await searchParams;
  let data;
  try {
    data = await getLabOrderForm();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  return (
    <div className="staff-page">
      <div className="staff-page-heading staff-page-heading--doctor lab-order-heading">
        <div className="staff-doctor-avatar lab-order-heading__icon" aria-hidden="true"><FlaskConical size={26} /></div>
        <div className="doctor-identity-copy">
          <p className="eyebrow">Clinical · Laboratory</p>
          <h1>New lab order</h1>
          <p>Order tests against a patient encounter. Charges are captured automatically when results are approved.</p>
        </div>
        <div className="staff-page-heading__actions"><Link className="btn btn--secondary" href="/staff/lab">← Back to laboratory</Link></div>
      </div>
      <LabOrderForm encounters={data.encounters as never} tests={data.tests as never} initialEncounterId={encounter ?? ""} />
    </div>
  );
}
