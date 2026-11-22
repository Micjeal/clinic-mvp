import type { ReactNode } from "react";

export function PatientPageHeader({ eyebrow, title, description, action, className = "" }: { eyebrow?: string; title: string; description?: string; action?: ReactNode; className?: string }) {
  return <header className={`patient-page-heading ${className}`.trim()}>
    <div>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </div>
    {action}
  </header>;
}

export function PatientPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`patient-panel ${className}`.trim()}>{children}</section>;
}
