import { CalendarCheck, Layers3, LockKeyhole } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import { clinicDescription } from "@/lib/public-content";
import { getPublicOrganizationProfile } from "@/server/services/settings.service";
import { getPublicDepartments } from "@/server/services/department.service";
import { getPublicServices } from "@/server/services/service.service";
import { getPublicFacilities } from "@/server/services/facility.service";
import { listPublicClinicians } from "@/server/repositories/clinician.repository";
import { HeroSearch } from "@/components/home/hero-search";

export async function HeroSection() {
  const [organization, departments, services, facilities, clinicians] = await Promise.all([getPublicOrganizationProfile(), getPublicDepartments(), getPublicServices(), getPublicFacilities(), listPublicClinicians()]);
  return (
    <section className="home-hero" aria-labelledby="home-hero-title">
      <div className="site-container home-hero__grid">
        <div className="home-hero__content">
          <p className="eyebrow">Patient-centred healthcare</p>
          <h1 id="home-hero-title">Healthcare you can rely on, when it matters most.</h1>
          <p className="lead">{organization?.description || clinicDescription()}</p>
          <HeroSearch
            departments={(departments as {id:string;name:string}[]).map(d=>({id:d.id,name:d.name}))}
            services={(services as {id:string;name:string}[]).map(v=>({id:v.id,name:v.name}))}
            facilities={(facilities as {id:string;name:string}[]).map(f=>({id:f.id,name:f.name}))}
            doctors={(clinicians as {key:string;displayName:string}[]).map(c=>({slug:c.key,name:c.displayName}))}
          />
          <div className="actions">
            <Link className="btn" href="/appointments">Book an appointment</Link>
            <Link className="text-link" href="/services">Explore services <span aria-hidden="true">→</span></Link>
          </div>
          <ul className="hero-trust" aria-label="Available patient services">
            <li><CalendarCheck aria-hidden="true" /><span>Appointment requests online</span></li>
            <li><LockKeyhole aria-hidden="true" /><span>Secure patient portal access</span></li>
            <li><Layers3 aria-hidden="true" /><span>Multiple care departments</span></li>
          </ul>
        </div>
        <div className="hero-visual" aria-label="Clinician speaking with a patient" role="img">
          <Image alt="Clinician speaking with a patient" className="site-photo" fill priority sizes="(max-width: 900px) 100vw, 48vw" src="/images/branding/Licensed clinic.jpg" />
          <div className="hero-status-card">
            <span className="status-dot" aria-hidden="true" />
            <div><strong>Plan your visit online</strong><span>Choose care, request a time, then track the review.</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
