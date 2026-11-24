import Image from "next/image";

import { clinicDescription, clinicName } from "@/lib/public-content";
import { getPublicDepartments } from "@/server/services/department.service";
import { getPublicFacilities } from "@/server/services/facility.service";
import { getPublicOrganizationProfile } from "@/server/services/settings.service";
import { getPublicServices } from "@/server/services/service.service";
import { listPublicClinicians } from "@/server/repositories/clinician.repository";
import { HeroSearch } from "@/components/home/hero-search";

const PANELS = [
  { src: "/images/branding/Licensed clinic.jpg", alt: "Clinician caring for a patient", clip: "polygon(0 0, 100% 0, 88% 100%, 0 100%)" },
  { src: "/images/facilities/Facility photography.jpg", alt: "Hospital facility", clip: "polygon(0 0, 100% 0, 94% 100%, 6% 100%)" },
  { src: "/images/branding/Licensed clinic.jpg", alt: "Care team", clip: "polygon(6% 0, 100% 0, 100% 100%, 0 100%)" },
];

export async function HeroSection() {
  const [organization, departments, services, facilities, clinicians] = await Promise.all([
    getPublicOrganizationProfile(), getPublicDepartments(), getPublicServices(), getPublicFacilities(), listPublicClinicians(),
  ]);
  const headline = organization?.name ? `${organization.name.toUpperCase()} HEALTHCARE` : "QUALITY CARE, CLOSE TO HOME";

  return (
    <section className="home-hero home-hero--strip" aria-labelledby="home-hero-title">
      <div className="home-hero__photos">
        {PANELS.map((panel, i) => (
          <div className="home-hero__photo" key={i} style={{ clipPath: panel.clip }}>
            <Image alt={panel.alt} fill priority={i === 0} sizes="33vw" src={panel.src} style={{ objectFit: "cover", objectPosition: "center top" }} />
          </div>
        ))}
      </div>

      <div className="home-hero__badge">
        <span className="home-hero__badge-mark" aria-hidden="true"><i /><i /></span>
        <span className="home-hero__badge-name">{organization?.name || clinicName()}</span>
      </div>

      <div className="home-hero__overlay site-container">
        <div className="home-hero__content">
          <HeroSearch
            departments={(departments as { id: string; name: string }[]).map((d) => ({ id: d.id, name: d.name }))}
            services={(services as { id: string; name: string }[]).map((v) => ({ id: v.id, name: v.name }))}
            facilities={(facilities as { id: string; name: string }[]).map((f) => ({ id: f.id, name: f.name }))}
            doctors={(clinicians as { key: string; displayName: string }[]).map((c) => ({ slug: c.key, name: c.displayName }))}
          />
          <h1 className="home-hero__title" id="home-hero-title">{headline}</h1>
          <p className="home-hero__sub">{organization?.description || clinicDescription()}</p>
          <div className="home-hero__dots-row" aria-hidden="true"><span className="is-active" /><span /><span /></div>
        </div>
      </div>

      <div className="home-hero__dotted" aria-hidden="true" />
    </section>
  );
}
