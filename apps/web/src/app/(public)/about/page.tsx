import { CalendarCheck, HeartHandshake, MessagesSquare, Route, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { AboutHero } from "@/components/home/about-hero";
import { clinicName, safeFacilityLocation, safeFacilityName } from "@/lib/public-content";
import { getPublicFacilities } from "@/server/services/facility.service";
import { getPublicOrganizationProfile } from "@/server/services/settings.service";

export const metadata = { title: "About" };

export default async function AboutPage() {
  const [facilities, organization] = await Promise.all([getPublicFacilities(), getPublicOrganizationProfile()]);
  return (
    <>
      <AboutHero />
      <section className="section">
        <div className="site-container split-layout">
          <div className="section-copy"><p className="eyebrow">Who we are</p><h2>Care begins with clear, useful information.</h2><p>Our public website helps patients understand available departments and services, locate a facility and submit an appointment request with the details the clinic needs to review it.</p></div>
          <div className="approach-panel">
            <article><HeartHandshake aria-hidden="true" /><div><h3>Patient-focused</h3><p>Care information is organised around the questions patients need answered.</p></div></article>
            <article><Route aria-hidden="true" /><div><h3>Coordinated</h3><p>Department and service pathways make the next step easier to understand.</p></div></article>
            <article><MessagesSquare aria-hidden="true" /><div><h3>Clear communication</h3><p>Appointment requests are clearly separated from confirmed appointments.</p></div></article>
          </div>
        </div>
      </section>
      <section className="section section--soft">
        <div className="site-container">
          <div className="section-heading section-heading--center"><p className="eyebrow">Website access</p><h2>What patients can do online.</h2></div>
          <div className="feature-row">
            <article><CalendarCheck aria-hidden="true" /><h3>Request an appointment</h3><p>Choose a location, department, service and preferred time for clinic review.</p></article>
            <article><ShieldCheck aria-hidden="true" /><h3>Use the patient portal</h3><p>Track request status and manage eligible cancellations after signing in.</p></article>
            <article><Route aria-hidden="true" /><h3>Explore care options</h3><p>Review public departments, services and facilities before making a request.</p></article>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="site-container">
          <div className="section-heading"><p className="eyebrow">Facility overview</p><h2>Find a care location.</h2></div>
          {facilities.length ? <div className="facility-list">{facilities.map((facility) => <article className="facility-card" key={facility.id}><div><span className="facility-type">{facility.facility_type}</span><h3>{safeFacilityName(facility.name)}</h3><p>{safeFacilityLocation(facility)}</p></div><Link className="card-link" href={`/appointments?facility=${facility.id}`}>Request an appointment <span aria-hidden="true">→</span></Link></article>)}</div> : <div className="empty-state">Public facility information is currently being configured.</div>}
        </div>
      </section>
      <section className="section compact-cta"><div className="site-container compact-cta__inner"><div><p className="eyebrow">Explore your options</p><h2>Find the care pathway that fits your needs.</h2></div><div className="actions"><Link className="btn" href="/departments">Explore departments</Link><Link className="btn btn--secondary" href="/appointments">Book appointment</Link></div></div></section>
    </>
  );
}
