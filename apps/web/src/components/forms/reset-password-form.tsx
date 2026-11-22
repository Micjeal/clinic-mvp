"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { resetPasswordAction } from "@/server/actions/auth.actions";
import { PasswordInput } from "@/components/forms/password-input";

function Submit() {
  const { pending } = useFormStatus();
  return <button className="btn auth-submit" disabled={pending}>{pending ? "Updating…" : "Update password"}</button>;
}

export default function ResetPasswordForm() {
  const [state, action] = useActionState(resetPasswordAction, null);
  return (
    <form action={action} className="auth-form">
      <label>New password<PasswordInput autoComplete="new-password" name="password" minLength={8} required /><small>Use at least 8 characters.</small></label>
      <label>Confirm password<PasswordInput autoComplete="new-password" name="confirm_password" minLength={8} required /></label>
      {state?.error ? <p className="error" role="alert">{state.error}</p> : null}
      <Submit />
    </form>
  );
}
