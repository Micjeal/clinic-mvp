import { ArrowLeft, CalendarPlus, Stethoscope } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHero } from "@/components/layout/page-hero";
import { DepartmentIcon } from "@/components/ui/department-icon";
import { getPublicDepartment, getPublicDepartments } from "@/server/services/department.service";
import { getPublicServicesForDepartment } from "@/server/services/service.service";
import { listPublicDirectoryClinicians } from "@/server/repositories/clinician.repository";
import { safePublicCopy } from "@/lib/public-content";

export default async function DepartmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [department, services, allDepartments, clinicians] = await Promise.all([
    getPublicDepartment(id),
    getPublicServicesForDepartment(id),
    getPublicDepartments(),
    listPublicDirectoryClinicians(),
  ]);
  if (!department) notFound();
  const related = allDepartments.filter((item) => item.id !== department.id).slice(0, 3);
  const departmentDoctors = clinicians.filter((doctor) => doctor.departments.some((item) => item.id === department.id));

  return (
    <>
      <PageHero eyebrow="Clinical department" title={department.name} description={safePublicCopy(department.description, "Department information is being prepared.")} breadcrumbs={[{ label: "Home", href: "/" }, { label: "Departments", href: "/departments" }, { label: department.name }]} />
      <section className="section">
        <div className="site-container department-detail-layout">
          <div>
            <div className="section-heading"><p className="eyebrow">Available care</p><h2>Services in this department.</h2></div>
            {services.length ? <div className="service-list">{services.map((service) => <article key={service.id}><span className="icon-box"><Stethoscope aria-hidden="true" /></span><div><h3>{service.name}</h3><p>{safePublicCopy(service.description, "Service information is being prepared.")}</p></div><Link className="card-link" href={`/appointments?department=${department.id}&service=${service.id}`}>Request service <span aria-hidden="true">→</span></Link></article>)}</div> : <div className="empty-state">No public services are currently listed for this department.</div>}
          </div>
          <aside className="appointment-aside" aria-labelledby="department-appointment-title">
            <span className="icon-box"><CalendarPlus aria-hidden="true" /></span><h2 id="department-appointment-title">Request an appointment</h2><p>Choose this department in the appointment form and tell the clinic your preferred time.</p><p className="request-note">Your request is not confirmed until reviewed by clinic staff.</p><Link className="btn" href={`/appointments?department=${department.id}`}>Book appointment</Link>
          </aside>
        </div>
      </section>
      {departmentDoctors.length ? <section className="section section--soft"><div className="site-container"><div className="section-heading section-heading--row"><div><p className="eyebrow">Our clinicians</p><h2>Doctors in this department.</h2></div><Link className="text-link" href="/doctors">View all doctors <span aria-hidden="true">→</span></Link></div><div className="card-grid">{departmentDoctors.slice(0, 3).map((doctor) => <article className="doctor-card" key={doctor.slug}><div className="doctor-card__avatar">{doctor.displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div><p className="eyebrow">{doctor.professionalTitle || "Clinician"}</p><h3>{doctor.displayName}</h3><p>{doctor.acceptingAppointments ? "Accepting appointment requests" : "Profile available"}</p><Link className="card-link" href={`/doctors/${doctor.slug}`}>View profile <span aria-hidden="true">→</span></Link></article>)}</div></div></section> : null}
      {related.length ? <section className="section section--soft"><div className="site-container"><div className="section-heading section-heading--row"><div><p className="eyebrow">More care options</p><h2>Related departments to explore.</h2></div><Link className="text-link" href="/departments"><ArrowLeft aria-hidden="true" />All departments</Link></div><div className="related-grid">{related.map((item) => <Link href={`/departments/${item.id}`} key={item.id}><span className="icon-box"><DepartmentIcon name={item.name} /></span><strong>{item.name}</strong><span aria-hidden="true">→</span></Link>)}</div></div></section> : null}
    </>
  );
}
