"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { signInAction } from "@/server/actions/auth.actions";
import { PasswordInput } from "@/components/forms/password-input";

function Submit() {
  const { pending } = useFormStatus();
  return <button className="btn auth-submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>;
}

export default function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(signInAction, null);
  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="next" value={next} />
      <label>Email address<input autoComplete="email" name="email" type="email" required /></label>
      <label>Password<PasswordInput autoComplete="current-password" name="password" minLength={8} required /></label>
      {state?.error ? <p className="error" role="alert">{state.error}</p> : null}
      <Submit />
    </form>
  );
}
