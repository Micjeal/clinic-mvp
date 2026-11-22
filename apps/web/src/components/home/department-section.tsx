import type { Tables } from "@clinic/database";
import Link from "next/link";

import { DepartmentIcon } from "@/components/ui/department-icon";
import { safePublicCopy } from "@/lib/public-content";

export function DepartmentSection({ departments }: { departments: Tables<"departments">[] }) {
  const highlighted = departments.slice(0, 6);
  return (
    <section className="section section--soft" aria-labelledby="departments-title">
      <div className="site-container">
        <div className="section-heading section-heading--row">
          <div><p className="eyebrow">Clinical departments</p><h2 id="departments-title">Find the right starting point for care.</h2></div>
          <Link className="btn btn--secondary" href="/departments">View all departments</Link>
        </div>
        {highlighted.length ? (
          <div className="department-grid">
            {highlighted.map((department) => (
              <article className="department-card" key={department.id}>
                <span className="icon-box"><DepartmentIcon name={department.name} /></span>
                <h3>{department.name}</h3>
                <p>{safePublicCopy(department.description, "Department information is being prepared.")}</p>
                <Link className="card-link" href={`/departments/${department.id}`}>Explore department <span aria-hidden="true">→</span></Link>
              </article>
            ))}
          </div>
        ) : <div className="empty-state">Public department information is currently being configured.</div>}
      </div>
    </section>
  );
}
