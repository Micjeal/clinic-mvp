import { Lock } from "lucide-react";

import ResetPasswordForm from "@/components/forms/reset-password-form";

export const metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <section className="auth-page">
      <div className="site-container auth-layout">
        <div className="auth-intro">
          <span className="icon-box"><Lock aria-hidden="true" /></span>
          <p className="eyebrow">Password reset</p>
          <h1>Set a new password.</h1>
          <p>Enter your new password below to complete the reset process.</p>
          <div className="auth-note">
            <strong>Choose a strong password</strong>
            <span>Use at least 8 characters with a mix of letters, numbers, and symbols.</span>
          </div>
        </div>
        <div className="auth-card">
          <div>
            <h2>Reset password</h2>
            <p>Enter your new password to complete the reset.</p>
          </div>
          <ResetPasswordForm />
        </div>
      </div>
    </section>
  );
}
