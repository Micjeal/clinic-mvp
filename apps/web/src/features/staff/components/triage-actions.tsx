"use client";
import { transitionQueueAction } from "@/server/actions/reception.actions";
export function StartTriageButton({ id, priority }: { id: string; priority: "routine" | "priority" | "urgent" | "emergency" }) { return <form action={async () => { await transitionQueueAction(id, "in_triage", priority); }}><button className="btn btn-primary" type="submit">Start triage</button></form>; }
