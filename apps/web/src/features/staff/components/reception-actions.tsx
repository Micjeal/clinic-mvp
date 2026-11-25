"use client";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
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

function QueueTransitionButton({ id, to, priority, label, primary, needsReason, navigateTo }: { id: string; to: "in_triage" | "waiting_clinician" | "with_clinician" | "completed" | "cancelled"; priority: "routine" | "priority" | "urgent" | "emergency"; label: string; primary?: boolean; needsReason?: boolean; navigateTo?: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(async (_prev: ActionResult, formData: FormData) => {
    const result = await transitionQueueAction(id, to, priority, formData);
    if (!result?.error && navigateTo) router.push(navigateTo);
    return result;
  }, null);
  return <form action={action}><ActionMessage state={state} />{needsReason ? <input className="staff-queue-override-reason" name="override_reason" placeholder="Reason for override" required /> : null}<button className={primary ? "btn btn-primary" : "btn"} disabled={pending} type="submit">{pending ? "Updating…" : label}</button></form>;
}

export function QueueAction({ id, status, priority, canAct = true, requiresOverride = false }: { id: string; status: "waiting_triage" | "in_triage" | "waiting_clinician" | "with_clinician"; priority: "routine" | "priority" | "urgent" | "emergency"; canAct?: boolean; requiresOverride?: boolean }) {
  if (status === "in_triage") return <Link className="btn" href={`/staff/triage/${id}`}>Continue triage</Link>;
  if (!canAct) return null;
  const config = status === "waiting_triage"
    ? { to: "in_triage" as const, label: "Start triage" }
    : status === "waiting_clinician"
      ? { to: "with_clinician" as const, label: "Start consult", primary: true }
      : { to: "completed" as const, label: "Complete visit" };
  return <QueueTransitionButton id={id} to={config.to} priority={priority} label={config.label} primary={"primary" in config ? config.primary : undefined} needsReason={requiresOverride} navigateTo={config.to === "with_clinician" ? `/staff/triage/${id}` : undefined} />;
}
