import { ArrowUpRight, CalendarPlus, Stethoscope } from "lucide-react";
import Link from "next/link";

import { PageHero } from "@/components/layout/page-hero";
import { getPublicDepartments } from "@/server/services/department.service";
import { getPublicServices } from "@/server/services/service.service";
import { safePublicCopy } from "@/lib/public-content";

export const metadata = { title: "Services" };

export default async function ServicesPage() {
  const [services, departments] = await Promise.all([getPublicServices(), getPublicDepartments()]);
  const departmentNames = new Map(departments.map((department) => [department.id, department.name]));
  return (
    <>
      <PageHero eyebrow="Service directory" title="Find a service for your next step in care." description="Browse the public services currently available and request a preferred appointment time for clinic review." />
      <section className="section">
        <div className="site-container">
          <div className="directory-intro"><div><p className="eyebrow">Available services</p><h2>Explore care by service.</h2></div><p>Department labels help you understand where each service sits within the wider care pathway.</p></div>
          {services.length ? <div className="service-grid service-grid--directory">{services.map((service) => <article className="service-card" key={service.id}><div><span className="icon-box"><Stethoscope aria-hidden="true" /></span>{service.department_id ? <p className="service-card__meta">{departmentNames.get(service.department_id) || "Clinical service"}</p> : null}<h2>{service.name}</h2><p>{safePublicCopy(service.description, "Service information is being prepared.")}</p></div><Link className="card-link" href={`/appointments?service=${service.id}${service.department_id ? `&department=${service.department_id}` : ""}`}>Book this service <ArrowUpRight aria-hidden="true" /></Link></article>)}</div> : <div className="empty-state">Public services are currently being configured.</div>}
        </div>
      </section>
      <section className="section compact-cta"><div className="site-container compact-cta__inner"><div><p className="eyebrow">Appointment request</p><h2>Found the service you need?</h2><p>Submit your preferred date and time. The clinic will review your request.</p></div><Link className="btn" href="/appointments"><CalendarPlus aria-hidden="true" />Book appointment</Link></div></section>
    </>
  );
}
