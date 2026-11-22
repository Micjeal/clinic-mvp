"use client";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { checkInAppointmentAction, transitionQueueAction } from "@/server/actions/reception.actions";

export function CheckInButton({ appointmentId }: { appointmentId: string }) { const { pending } = useFormStatus(); return <form action={async () => { await checkInAppointmentAction(appointmentId); }}><button className="btn" disabled={pending} type="submit">{pending ? "Checking in…" : "Check in"}</button></form>; }
export function QueueAction({ id, status, priority }: { id: string; status: "waiting_triage" | "in_triage" | "waiting_clinician"; priority: "routine" | "priority" | "urgent" | "emergency" }) { if (status === "waiting_triage") return <form action={async () => { await transitionQueueAction(id, "in_triage", priority); }}><button className="btn" type="submit">Start triage</button></form>; if (status === "in_triage") return <Link className="btn" href={`/staff/triage/${id}`}>Continue triage</Link>; return null; }
