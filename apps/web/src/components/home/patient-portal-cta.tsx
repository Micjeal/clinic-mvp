import { CalendarDays, LockKeyhole } from "lucide-react";
import Link from "next/link";

export function PatientPortalCta() {
  return (
    <section className="section portal-cta" aria-labelledby="portal-cta-title">
      <div className="site-container portal-cta__inner">
        <div className="portal-cta__icons" aria-hidden="true"><LockKeyhole /><CalendarDays /></div>
        <div><p className="eyebrow">Patient portal</p><h2 id="portal-cta-title">Manage your care in one place.</h2><p>View appointment requests, track their status and manage eligible cancellations securely through your patient portal.</p></div>
        <div className="actions"><Link className="btn btn--light" href="/portal">Patient portal</Link><Link className="text-link text-link--light" href="/login">Sign in <span aria-hidden="true">→</span></Link></div>
      </div>
    </section>
  );
}
