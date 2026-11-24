import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getLabOrderForm } from "@/server/services/lab.service";
import { AuthorizationError } from "@/server/errors";
import { LabOrderForm } from "@/features/lab/components/lab-order-form";
import Link from "next/link";

export const metadata = { title: "New lab order" };

export default async function NewLabOrderPage() {
  let data;
  try {
    data = await getLabOrderForm();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  return (
    <div className="staff-page">
      <StaffPageHeader eyebrow="Clinical" title="New lab order" description="Order tests against a patient encounter." actions={<Link className="btn btn--secondary" href="/staff/lab">← Back to laboratory</Link>} />
      <LabOrderForm encounters={data.encounters as never} tests={data.tests as never} />
    </div>
  );
}
