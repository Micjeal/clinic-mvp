import { CalendarPlus } from "lucide-react";
import Link from "next/link";

import { PageHero } from "@/components/layout/page-hero";
import { DepartmentIcon } from "@/components/ui/department-icon";
import { getPublicDepartments } from "@/server/services/department.service";
import { safePublicCopy } from "@/lib/public-content";

export const metadata = { title: "Departments" };

export default async function DepartmentsPage() {
  const departments = await getPublicDepartments();
  return (
    <>
      <PageHero eyebrow="Care directory" title="Clinical departments for your care needs." description="Explore public department information and follow the link to available services before you submit an appointment request." />
      <section className="section">
        <div className="site-container">
          <div className="directory-intro"><div><p className="eyebrow">Our departments</p><h2>Choose a starting point.</h2></div><p>Not sure which department fits? Review the summaries below or contact the clinic for guidance.</p></div>
          {departments.length ? <div className="department-grid department-grid--directory">{departments.map((department) => <article className="department-card" key={department.id}><span className="icon-box"><DepartmentIcon name={department.name} /></span><h2>{department.name}</h2><p>{safePublicCopy(department.description, "Department information is being prepared.")}</p><Link className="card-link" href={`/departments/${department.id}`}>View department <span aria-hidden="true">→</span></Link></article>)}</div> : <div className="empty-state">Public departments are currently being configured.</div>}
        </div>
      </section>
      <section className="section compact-cta"><div className="site-container compact-cta__inner"><div><p className="eyebrow">Appointments</p><h2>Ready to request a preferred time?</h2><p>Requests are reviewed by the clinic before they are confirmed.</p></div><Link className="btn" href="/appointments"><CalendarPlus aria-hidden="true" />Book appointment</Link></div></section>
    </>
  );
}
