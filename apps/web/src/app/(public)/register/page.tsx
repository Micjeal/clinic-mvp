import { UserPlus } from "lucide-react";
import Link from "next/link";

import RegisterForm from "@/components/forms/register-form";

export const metadata = { title: "Register" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  return (
    <section className="auth-page">
      <div className="site-container auth-layout">
        <div className="auth-intro"><span className="icon-box"><UserPlus aria-hidden="true" /></span><p className="eyebrow">Patient access</p><h1>Create your patient account.</h1><p>Use your account to submit appointment requests and securely follow their progress.</p><div className="auth-note"><strong>Submitting a request does not confirm an appointment.</strong><span>Clinic staff review the date, time and service details you provide.</span></div></div>
        <div className="auth-card"><div><h2>Register</h2><p>Enter your details to create a secure patient account.</p></div><RegisterForm next={params.next || "/portal"} /><p className="auth-switch">Already have an account? <Link href={`/login?next=${encodeURIComponent(params.next || "/portal")}`}>Sign in</Link></p></div>
      </div>
    </section>
  );
}
