import { LockKeyhole } from "lucide-react";
import Link from "next/link";

import LoginForm from "@/components/forms/login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; setup?: string }> }) {
  const params = await searchParams;
  const setupError = params.setup === "patient-profile" || params.setup === "error";
  return (
    <section className="auth-page">
      <div className="site-container auth-layout">
        <div className="auth-intro"><span className="icon-box"><LockKeyhole aria-hidden="true" /></span><p className="eyebrow">Patient access</p><h1>Welcome back.</h1><p>Sign in to view your appointment requests, track their status and manage eligible cancellations.</p><div className="auth-note"><strong>Your appointment data stays connected to your secure account.</strong><span>Do not share your password or sign-in details.</span></div></div>
        <div className="auth-card"><div><h2>Sign in</h2><p>Enter the email and password linked to your patient account.</p></div>{setupError?<p className="error" role="alert">We couldn&apos;t finish setting up your patient profile. Please complete your details or contact the clinic.</p>:null}<LoginForm next={params.next || "/portal"} /><div className="auth-staff-link"><span>Clinic employee?</span><Link href="/staff/login">Sign in to Staff Portal</Link></div><p className="auth-switch">New to the patient portal? <Link href={`/register?next=${encodeURIComponent(params.next || "/portal")}`}>Create an account</Link></p></div>
      </div>
    </section>
  );
}
