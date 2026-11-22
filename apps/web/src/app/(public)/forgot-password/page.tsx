import { Mail } from "lucide-react";
import Link from "next/link";

import ForgotPasswordForm from "@/components/forms/forgot-password-form";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <section className="auth-page">
      <div className="site-container auth-layout">
        <div className="auth-intro">
          <span className="icon-box"><Mail aria-hidden="true" /></span>
          <p className="eyebrow">Password recovery</p>
          <h1>Reset your password.</h1>
          <p>Enter your email address and we&apos;ll send you a link to reset your password.</p>
          <div className="auth-note">
            <strong>Check your email</strong>
            <span>The reset link will expire after a short time for security.</span>
          </div>
        </div>
        <div className="auth-card">
          <div>
            <h2>Forgot password</h2>
            <p>Enter your email to receive a password reset link.</p>
          </div>
          <ForgotPasswordForm />
          <p className="auth-switch">
            Remember your password? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
