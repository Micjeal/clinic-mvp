import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPublicFacilities } from "@/server/services/facility.service";
import { getPublicDepartments } from "@/server/services/department.service";
import { getPublicServices } from "@/server/services/service.service";
import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { WalkInForm } from "@/features/staff/components/walk-in-form";

export const metadata = { title: "Walk-in check-in" };

export default async function WalkInPage() {
  const [facilities, departments, services] = await Promise.all([getPublicFacilities(), getPublicDepartments(), getPublicServices()]);
  return <div className="staff-page">
    <StaffPageHeader
      eyebrow="Reception"
      title="Walk-in check-in"
      description="Find or register a patient and place the visit in the triage queue."
      actions={<Link className="btn btn-secondary" href="/staff/reception"><ArrowLeft aria-hidden="true" />Back to reception</Link>}
    />
    <div className="staff-form-page"><WalkInForm facilities={facilities} departments={departments} services={services} /></div>
  </div>;
}
