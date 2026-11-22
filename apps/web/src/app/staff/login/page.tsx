import {Building2,ShieldCheck} from "lucide-react";
import Link from "next/link";
import {StaffLoginForm} from "@/features/staff/components/staff-login-form";
import {clinicName} from "@/lib/public-content";

export const metadata={title:"Staff sign in"};

export default function StaffLoginPage(){return <div className="staff-surface staff-login-page"><div className="staff-login-layout">
  <section className="staff-login-intro"><Link className="staff-login-brand" href="/"><span><Building2 aria-hidden="true" /></span><strong>{clinicName()}</strong></Link><div><p className="eyebrow">Staff portal</p><h1>Care operations, clearly organized.</h1><p>Secure access for authorized clinic personnel managing patient appointment requests.</p></div><div className="staff-login-trust"><ShieldCheck aria-hidden="true" /><span><strong>Protected staff workspace</strong><small>For authorized clinic personnel only.</small></span></div></section>
  <section className="staff-login-card" aria-labelledby="staff-login-title"><p className="eyebrow">Staff portal</p><h2 id="staff-login-title">Sign in to continue</h2><p>Use the email and password linked to your clinic staff account.</p><StaffLoginForm/><div className="staff-authorized-note"><ShieldCheck aria-hidden="true" />Authorized clinic personnel only.</div><Link className="staff-return-link" href="/">← Return to clinic website</Link></section>
  </div></div>;}
