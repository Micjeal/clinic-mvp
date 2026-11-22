"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { signUpAction } from "@/server/actions/auth.actions";
import { PasswordInput } from "@/components/forms/password-input";

function Submit() {
  const { pending } = useFormStatus();
  return <button className="btn auth-submit" disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>;
}

export default function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState(signUpAction, null);
  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="next" value={next} />
      <div className="form-grid">
        <label>First name<input autoComplete="given-name" name="first_name" required /></label>
        <label>Last name<input autoComplete="family-name" name="last_name" required /></label>
      </div>
      <label>Phone<input autoComplete="tel" name="phone" required /></label>
      <label>Email address<input autoComplete="email" name="email" type="email" required /></label>
      <label>Password<PasswordInput autoComplete="new-password" name="password" minLength={8} required /><small>Use at least 8 characters.</small></label>
      {state?.error ? <p className="error" role="alert">{state.error}</p> : null}
      {state?.success ? <p className="success" role="status">{state.success}</p> : null}
      <Submit />
    </form>
  );
}
