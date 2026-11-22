import { Building2, CalendarPlus, HeartPulse, Stethoscope } from "lucide-react";
import Link from "next/link";

const actions = [
  { title: "Book appointment", description: "Choose your care and submit a preferred date and time.", href: "/appointments", icon: CalendarPlus },
  { title: "Find a department", description: "Start with the clinical department that best fits your needs.", href: "/departments", icon: Stethoscope },
  { title: "Our facilities", description: "Review available care locations and location information.", href: "/facilities", icon: Building2 },
  { title: "Emergency / urgent care", description: "Find guidance and configured contact information.", href: "/contact", icon: HeartPulse },
] as const;

export function QuickActions() {
  return (
    <section className="quick-actions" aria-label="Quick patient actions">
      <div className="site-container quick-actions__grid">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link className="quick-action" href={action.href} key={action.title}>
              <span className="icon-box"><Icon aria-hidden="true" /></span>
              <span><strong>{action.title}</strong><small>{action.description}</small></span>
              <span className="quick-action__arrow" aria-hidden="true">→</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
