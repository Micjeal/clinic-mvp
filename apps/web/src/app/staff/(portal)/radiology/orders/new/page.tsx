import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getImagingOrderForm } from "@/server/services/radiology.service";
import { AuthorizationError } from "@/server/errors";
import { ImagingOrderForm } from "@/features/radiology/components/radiology-workspace";
import Link from "next/link";

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
      <StaffPageHeader eyebrow="Clinical" title="New imaging order" description="Order a radiology exam against a patient encounter." actions={<Link className="btn btn--secondary" href="/staff/radiology">← Back to radiology</Link>} />
      <ImagingOrderForm encounters={data.encounters as never} tests={data.tests as never} initialEncounterId={encounter ?? ""} />
    </div>
  );
}
