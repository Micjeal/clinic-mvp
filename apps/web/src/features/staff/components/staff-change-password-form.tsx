"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { PasswordInput } from "@/components/forms/password-input";
import { changeStaffPasswordAction } from "@/server/actions/staff-password.actions";

function Submit() {
  const { pending } = useFormStatus();
  return <button className="btn staff-login-submit" disabled={pending}>{pending ? "Updating password…" : "Update Password"}</button>;
}

export function StaffChangePasswordForm() {
  const [state, action] = useActionState(changeStaffPasswordAction, null);
  return (
    <form action={action} className="staff-password-form">
      <label>Current temporary password<PasswordInput autoComplete="current-password" name="currentPassword" required /></label>
      <label>New password<PasswordInput autoComplete="new-password" name="newPassword" minLength={12} required aria-describedby="staff-password-help" /></label>
      <p id="staff-password-help" className="staff-password-help">Use at least 12 characters. A private passphrase is a good choice.</p>
      <label>Confirm new password<PasswordInput autoComplete="new-password" name="confirmPassword" minLength={12} required /></label>
      {state?.error ? <p className="staff-form-message staff-form-message--error" role="alert">{state.error}</p> : null}
      <Submit />
    </form>
  );
}
