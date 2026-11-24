import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getPoFormData } from "@/server/services/procurement.service";
import { AuthorizationError } from "@/server/errors";
import { PoForm } from "@/features/procurement/components/procurement-workspace";
import Link from "next/link";

export const metadata = { title: "New purchase order" };

export default async function NewPoPage() {
  let data;
  try {
    data = await getPoFormData();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  return (
    <div className="staff-page">
      <StaffPageHeader eyebrow="Operations" title="New purchase order" description="Order stock from a supplier." actions={<Link className="btn btn--secondary" href="/staff/procurement">← Back to procurement</Link>} />
      <PoForm facilities={data.facilities as never} items={data.items as never} suppliers={data.suppliers as never} />
    </div>
  );
}
