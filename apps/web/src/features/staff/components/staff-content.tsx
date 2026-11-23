import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type StaffPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  context?: ReactNode;
  className?: string;
};

export function StaffPageHeader({ eyebrow, title, description, actions, context, className = "" }: StaffPageHeaderProps) {
  return <header className={`staff-page-heading ${className}`.trim()}>
    <div>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </div>
    {actions || context ? <div className="staff-page-heading__actions">{actions}{context}</div> : null}
  </header>;
}

export function StaffSection({ title, eyebrow, description, action, children, className = "" }: { title: string; eyebrow?: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`staff-panel staff-section ${className}`.trim()}>
    <div className="staff-panel-heading">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {description ? <p className="staff-section-description">{description}</p> : null}
      </div>
      {action}
    </div>
    {children}
  </section>;
}

type StaffKpiCardProps = {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "teal" | "blue" | "green" | "amber" | "rose" | "violet" | "cyan";
  href?: string;
};

export function StaffKpiCard({ icon: Icon, label, value, hint, tone = "teal", href }: StaffKpiCardProps) {
  const body = <>
    <div className="staff-kpi__top"><span>{label}</span><span className={`staff-kpi__icon staff-kpi__icon--${tone}`}><Icon aria-hidden="true" /></span></div>
    <strong>{value}</strong>
    {hint ? <small>{hint}</small> : null}
  </>;
  return href
    ? <Link className={`staff-kpi staff-kpi--${tone}`} href={href}>{body}</Link>
    : <article className={`staff-kpi staff-kpi--${tone}`}>{body}</article>;
}

export type StaffQuickAction = { href: string; label: string; description?: string; icon: LucideIcon };

export function StaffQuickActions({ actions, title = "Quick actions" }: { actions: StaffQuickAction[]; title?: string }) {
  if (!actions.length) return null;
  return <section className="staff-panel staff-quick-actions" aria-label={title}>
    <div className="staff-panel-heading"><div><p className="eyebrow">Shortcuts</p><h2>{title}</h2></div></div>
    <div className="staff-quick-actions__grid">
      {actions.map((action) => {
        const Icon = action.icon;
        return <Link className="staff-quick-action" href={action.href} key={action.href}>
          <span className="staff-quick-action__icon"><Icon aria-hidden="true" /></span>
          <span><strong>{action.label}</strong>{action.description ? <small>{action.description}</small> : null}</span>
        </Link>;
      })}
    </div>
  </section>;
}
