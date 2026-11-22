import { Building2, CalendarPlus, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

import { PageHero } from "@/components/layout/page-hero";
import { isPlaceholderValue, safeFacilityLocation, safeFacilityName } from "@/lib/public-content";
import { getPublicDepartments } from "@/server/services/department.service";
import { getPublicFacilities } from "@/server/services/facility.service";
import { getPublicServices } from "@/server/services/service.service";

export const metadata = { title: "Facilities" };

export default async function FacilitiesPage() {
  const [facilities, departments, services] = await Promise.all([getPublicFacilities(), getPublicDepartments(), getPublicServices()]);
  return (
    <>
      <PageHero eyebrow="Care locations" title="Find a facility for your care journey." description="Review public location information and the care options currently connected to each facility." />
      <section className="section">
        <div className="site-container">
          {facilities.length ? <div className="facility-list">{facilities.map((facility) => {
            const facilityDepartments = departments.filter((department) => department.facility_id === facility.id);
            const facilityServices = services.filter((service) => service.facility_id === facility.id);
            return <article className="facility-card facility-card--detailed" key={facility.id}><div className="facility-card__visual"><Building2 aria-hidden="true" /><span>Facility image slot</span></div><div className="facility-card__body"><span className="facility-type">{facility.facility_type}</span><h2>{safeFacilityName(facility.name)}</h2><p className="facility-location"><MapPin aria-hidden="true" />{safeFacilityLocation(facility)}</p>{!isPlaceholderValue(facility.phone) ? <p className="facility-contact"><Phone aria-hidden="true" />{facility.phone}</p> : null}{!isPlaceholderValue(facility.email) ? <p className="facility-contact"><Mail aria-hidden="true" />{facility.email}</p> : null}{facilityDepartments.length || facilityServices.length ? <div className="facility-availability"><strong>Public care information</strong><p>{facilityDepartments.length ? `${facilityDepartments.length} department${facilityDepartments.length === 1 ? "" : "s"}` : ""}{facilityDepartments.length && facilityServices.length ? " · " : ""}{facilityServices.length ? `${facilityServices.length} service${facilityServices.length === 1 ? "" : "s"}` : ""}</p></div> : null}<div className="actions"><Link className="btn" href={`/appointments?facility=${facility.id}`}><CalendarPlus aria-hidden="true" />Book appointment</Link><Link className="btn btn--secondary" href="/contact">Contact</Link></div></div></article>;
          })}</div> : <div className="empty-state">Public facilities are currently being configured.</div>}
        </div>
      </section>
    </>
  );
}
