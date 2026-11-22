import { getPublicFacilities } from "@/server/services/facility.service";
import { getPublicDepartments } from "@/server/services/department.service";
import { getPublicServices } from "@/server/services/service.service";
import { WalkInForm } from "@/features/staff/components/walk-in-form";
export const metadata = { title: "Walk-in check-in" };
export default async function WalkInPage() { const [facilities, departments, services] = await Promise.all([getPublicFacilities(), getPublicDepartments(), getPublicServices()]); return <div className="staff-page"><header className="staff-page-heading"><div><p className="eyebrow">Reception</p><h1>Walk-in check-in</h1><p>Find or register a patient and place the visit in the triage queue.</p></div></header><WalkInForm facilities={facilities} departments={departments} services={services} /></div>; }
