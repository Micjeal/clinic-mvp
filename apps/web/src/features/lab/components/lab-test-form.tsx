"use client";

import { useState, useTransition } from "react";
import { createLabTestAction } from "@/server/actions/lab.actions";

export function LabTestForm({ departments, canManage }: { departments: { id: string; name: string }[]; canManage: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  if (!canManage) return null;
  return (
    <form action={(formData) => startTransition(async () => {
      const result = await createLabTestAction(null, formData);
      setMessage(result.error ?? "Test added.");
      if (!result.error) window.location.reload();
    })} className="staff-form-grid" style={{ marginBottom: "1.25rem" }}>
      <label>Code<input name="code" placeholder="e.g. FBC" required /></label>
      <label>Name<input name="name" placeholder="Full blood count" required /></label>
      <label>Specimen<input name="specimen_type" placeholder="e.g. Blood" /></label>
      <label>Unit<input name="default_unit" placeholder="e.g. g/dL" /></label>
      <label>Reference range<input name="reference_range_text" placeholder="e.g. 12–16" /></label>
      <label>Price<input min="0" name="price" step="0.01" type="number" required /></label>
      <label>Department<select name="department_id" defaultValue=""><option value="">General lab</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
      <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Adding…" : "Add test"}</button>{message ? <span className="staff-table-empty">{message}</span> : null}</div>
    </form>
  );
}
