"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { forgotPasswordAction } from "@/server/actions/auth.actions";

function Submit() {
  const { pending } = useFormStatus();
  return <button className="btn auth-submit" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</button>;
}

export default function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, null);
  return (
    <form action={action} className="auth-form">
      <label>Email address<input autoComplete="email" name="email" type="email" required /></label>
      {state?.error ? <p className="error" role="alert">{state.error}</p> : null}
      {state?.success ? <p className="success" role="status">{state.success}</p> : null}
      <Submit />
    </form>
  );
}
