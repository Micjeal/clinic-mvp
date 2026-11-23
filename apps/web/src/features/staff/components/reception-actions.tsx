"use client";
import { useActionState } from "react";
import Link from "next/link";
import { checkInAppointmentAction, transitionQueueAction } from "@/server/actions/reception.actions";

type ActionResult = { error?: string; success?: string } | null;

function ActionMessage({ state }: { state: ActionResult }) {
  if (!state) return null;
  if (state.error) return <p className="form-error" role="alert">{state.error}</p>;
  if (state.success) return <p className="form-success" role="status">{state.success}</p>;
  return null;
}

export function CheckInButton({ appointmentId }: { appointmentId: string }) {
  const [state, action, pending] = useActionState(checkInAppointmentAction.bind(null, appointmentId), null);
  return <form action={action}><ActionMessage state={state} /><button className="btn" disabled={pending} type="submit">{pending ? "Checking in…" : "Check in"}</button></form>;
}

function QueueTransitionButton({ id, to, priority, label, primary }: { id: string; to: "in_triage" | "waiting_clinician" | "with_clinician" | "completed" | "cancelled"; priority: "routine" | "priority" | "urgent" | "emergency"; label: string; primary?: boolean }) {
  const [state, action, pending] = useActionState(transitionQueueAction.bind(null, id, to, priority), null);
  return <form action={action}><ActionMessage state={state} /><button className={primary ? "btn btn-primary" : "btn"} disabled={pending} type="submit">{pending ? "Updating…" : label}</button></form>;
}

export function QueueAction({ id, status, priority }: { id: string; status: "waiting_triage" | "in_triage" | "waiting_clinician" | "with_clinician"; priority: "routine" | "priority" | "urgent" | "emergency" }) {
  if (status === "in_triage") return <Link className="btn" href={`/staff/triage/${id}`}>Continue triage</Link>;
  const config = status === "waiting_triage"
    ? { to: "in_triage" as const, label: "Start triage" }
    : status === "waiting_clinician"
      ? { to: "with_clinician" as const, label: "Start consult", primary: true }
      : { to: "completed" as const, label: "Complete visit" };
  return <QueueTransitionButton id={id} to={config.to} priority={priority} label={config.label} primary={"primary" in config ? config.primary : undefined} />;
}
