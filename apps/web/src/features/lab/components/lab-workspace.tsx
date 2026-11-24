"use client";

import { useState, useTransition } from "react";
import { approveLabResultServerAction, collectSampleAction, processItemAction, saveLabResultAction } from "@/server/actions/lab.actions";

export function LabItemActions({ itemId, orderId, itemStatus, canWrite }: { itemId: string; orderId: string; itemStatus: string; canWrite: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const run = (fn: () => Promise<{ error?: string }>) => startTransition(async () => {
    const result = await fn();
    setMessage(result.error ?? "");
    if (!result.error) window.location.reload();
  });
  if (!canWrite || ["completed", "cancelled"].includes(itemStatus)) return message ? <span className="staff-table-empty">{message}</span> : null;
  return (
    <span style={{ display: "inline-flex", gap: ".4rem", flexWrap: "wrap" }}>
      {itemStatus === "ordered" ? <button className="btn btn--secondary btn--compact" disabled={pending} onClick={() => run(() => collectSampleAction(itemId, orderId))} type="button">Collect sample</button> : null}
      {itemStatus === "sample_collected" ? <button className="btn btn--secondary btn--compact" disabled={pending} onClick={() => run(() => processItemAction(itemId, orderId))} type="button">Start processing</button> : null}
      {message ? <span className="staff-table-empty">{message}</span> : null}
    </span>
  );
}

type ItemResult = {
  id: string; result_value: string | null; unit: string | null; reference_range: string | null;
  abnormal_flag: string | null; result_text: string | null; resulted_at: string | null;
  approved_at: string | null; patient_visible: boolean;
} | null;

export function LabResultForm({ itemId, orderId, patientId, unit, referenceRange, result, readOnly, approved }: {
  itemId: string; orderId: string; patientId: string;
  unit: string | null; referenceRange: string | null;
  result: ItemResult; readOnly: boolean; approved: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  if (approved) return <span className="staff-status staff-status--paid">Approved</span>;
  if (readOnly) return <span className="staff-table-sub">{result ? "Result pending approval" : "Awaiting sample"}</span>;
  return (
    <form action={(formData) => startTransition(async () => {
      const outcome = await saveLabResultAction(null, formData);
      setMessage(outcome.error ?? "Result saved.");
      if (!outcome.error) window.location.reload();
    })} className="staff-form-grid" style={{ minWidth: "16rem" }}>
      <input name="item_id" type="hidden" value={itemId} />
      <input name="order_id" type="hidden" value={orderId} />
      <input name="patient_id" type="hidden" value={patientId} />
      <label>Result<input defaultValue={result?.result_value ?? ""} name="result_value" placeholder="e.g. 5.4" /></label>
      <label>Unit<input defaultValue={result?.unit ?? unit ?? ""} name="unit" /></label>
      <label>Reference<input defaultValue={result?.reference_range ?? referenceRange ?? ""} name="reference_range" /></label>
      <label>Flag<select defaultValue={result?.abnormal_flag ?? ""} name="abnormal_flag">
        <option value="">—</option><option value="normal">Normal</option><option value="low">Low</option><option value="high">High</option><option value="critical">Critical</option><option value="abnormal">Abnormal</option>
      </select></label>
      <label className="staff-form-grid__wide">Notes<textarea defaultValue={result?.result_text ?? ""} name="result_text" rows={2} /></label>
      <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Saving…" : "Save result"}</button>{message ? <span className="staff-table-empty">{message}</span> : null}</div>
    </form>
  );
}

export function ApproveResultButton({ resultId, orderId }: { resultId: string; orderId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <span style={{ display: "inline-flex", gap: ".4rem", alignItems: "center" }}>
      <button className="btn btn--compact" disabled={pending} onClick={() => startTransition(async () => {
        const outcome = await approveLabResultServerAction(resultId, orderId);
        setMessage(outcome.error ?? "");
        if (!outcome.error) window.location.reload();
      })} type="button">{pending ? "Approving…" : "Approve"}</button>
      {message ? <span className="staff-table-empty">{message}</span> : null}
    </span>
  );
}
