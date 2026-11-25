"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { notifyDoctorLabAction } from "@/server/actions/lab.actions";
import { notifyDoctorImagingAction } from "@/server/actions/radiology.actions";

export function NotifyDoctorButton({ orderId, kind, notified }: { orderId: string; kind: "lab" | "imaging"; notified: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (notified) return <span className="lab-flag lab-flag--normal">Sent to doctor</span>;
  return (
    <button className="btn" disabled={pending} onClick={() => startTransition(async () => {
      const result = kind === "lab" ? await notifyDoctorLabAction(orderId) : await notifyDoctorImagingAction(orderId);
      if (!result?.error) router.refresh();
    })} type="button">{pending ? "Sending…" : "Send to doctor"}</button>
  );
}
