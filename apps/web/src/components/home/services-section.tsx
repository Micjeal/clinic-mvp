import type { Tables } from "@clinic/database";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { safePublicCopy } from "@/lib/public-content";

export function ServicesSection({ services, departments }: { services: Tables<"services">[]; departments: Tables<"departments">[] }) {
  const departmentNames = new Map(departments.map((department) => [department.id, department.name]));
  const highlighted = services.slice(0, 6);
  return (
    <section className="section" aria-labelledby="services-title">
      <div className="site-container">
        <div className="section-heading section-heading--row">
          <div><p className="eyebrow">Care services</p><h2 id="services-title">Services designed around the next step you need.</h2></div>
          <Link className="text-link" href="/services">View all services <span aria-hidden="true">→</span></Link>
        </div>
        {highlighted.length ? (
          <div className="service-grid">
            {highlighted.map((service) => (
              <article className="service-card" key={service.id}>
                <div>
                  {service.department_id ? <p className="service-card__meta">{departmentNames.get(service.department_id) || "Clinical service"}</p> : null}
                  <h3>{service.name}</h3>
                  <p>{safePublicCopy(service.description, "Service information is being prepared.")}</p>
                </div>
                <Link className="card-link" href={`/appointments?service=${service.id}`}>Request this service <ArrowUpRight aria-hidden="true" /></Link>
              </article>
            ))}
          </div>
        ) : <div className="empty-state">Public service information is currently being configured.</div>}
      </div>
    </section>
  );
}
