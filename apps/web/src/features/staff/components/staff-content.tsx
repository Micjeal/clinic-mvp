import type { ReactNode } from "react";

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
