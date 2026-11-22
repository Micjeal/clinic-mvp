import type { Tables } from "@clinic/database";
import { MapPin } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import { safeFacilityLocation, safeFacilityName } from "@/lib/public-content";

export function FacilityFeature({ facilities }: { facilities: Tables<"facilities">[] }) {
  const facility = facilities[0];
  return (
    <section className="section section--soft" aria-labelledby="facility-title">
      <div className="site-container facility-feature">
        <div className="facility-feature__visual"><Image alt="Clinic facility exterior" className="site-photo" fill sizes="(max-width: 900px) 100vw, 48vw" src="/images/facilities/Facility photography.jpg" /></div>
        <div className="section-copy">
          <p className="eyebrow">Our care locations</p>
          <h2 id="facility-title">Care starts with the right location.</h2>
          {facility ? <><h3>{safeFacilityName(facility.name)}</h3><p className="facility-location"><MapPin aria-hidden="true" />{safeFacilityLocation(facility)}</p><p>Review public location details, then select this facility when submitting your appointment request.</p></> : <p>Public facility information is currently being configured.</p>}
          <div className="actions"><Link className="btn btn--secondary" href="/facilities">View facilities</Link>{facility ? <Link className="btn" href={`/appointments?facility=${facility.id}`}>Book appointment</Link> : <Link className="btn" href="/contact">Contact us</Link>}</div>
        </div>
      </div>
    </section>
  );
}
