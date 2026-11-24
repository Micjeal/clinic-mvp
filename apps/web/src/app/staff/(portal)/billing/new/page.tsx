import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getBillingFormData } from "@/server/services/billing.service";
import { AuthorizationError } from "@/server/errors";
import { InvoiceCreateForm } from "@/features/billing/components/invoice-create-form";
import Link from "next/link";

export const metadata = { title: "New invoice" };

export default async function NewInvoicePage() {
  let data;
  try {
    data = await getBillingFormData();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  return (
    <div className="staff-page">
      <StaffPageHeader eyebrow="Finance" title="New invoice" description="Bill a patient for services rendered." actions={<Link className="btn btn--secondary" href="/staff/billing">← Back to billing</Link>} />
      <InvoiceCreateForm facilities={data.facilities} patients={data.patients} />
    </div>
  );
}
