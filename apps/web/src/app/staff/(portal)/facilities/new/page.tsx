import {StaffPageHeader} from "@/features/staff/components/staff-content";
import {FacilityForm} from "@/features/catalog/catalog-forms";

export const metadata = {title: "Add facility"};

export default function NewFacilityPage() {
  return <div className="staff-page">
    <StaffPageHeader eyebrow="Administration" title="Add facility" description="Create a clinic location that departments can be assigned to." />
    <FacilityForm />
  </div>;
}
