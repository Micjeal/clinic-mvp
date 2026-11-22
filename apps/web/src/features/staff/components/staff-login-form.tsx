"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { PasswordInput } from "@/components/forms/password-input";
import { staffSignInAction } from "@/server/actions/staff-auth.actions";

function Submit() {
  const { pending } = useFormStatus();
  return <button className="btn staff-login-submit" disabled={pending}>{pending ? "Signing in…" : "Sign in to Staff Portal"}</button>;
}

export function StaffLoginForm() {
  const [state, action] = useActionState(staffSignInAction, null);
  return (
    <form action={action} className="staff-login-form">
      <label>Email address<input autoComplete="email" inputMode="email" name="email" type="email" required /></label>
      <label>Password<PasswordInput autoComplete="current-password" name="password" minLength={8} required /></label>
      {state?.error ? <p className="staff-form-message staff-form-message--error" role="alert">{state.error}</p> : null}
      <Submit />
    </form>
  );
}
