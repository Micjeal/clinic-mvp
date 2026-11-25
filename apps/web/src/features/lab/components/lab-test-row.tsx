"use client";

import { useState, useTransition } from "react";
import { updateLabTestAction } from "@/server/actions/lab.actions";

type Test = { id: string; code: string; name: string; specimen_type: string | null; default_unit: string | null; reference_range_text: string | null; price: number; currency_code: string; is_active: boolean; department_id: string | null };

export function LabTestRow({ test, departments, canManage }: { test: Test; departments: { id: string; name: string }[]; canManage: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  if (editing) {
    return (
      <tr className="lab-test-edit-row"><td colSpan={canManage ? 7 : 6}>
      <form action={(fd) => startTransition(async () => {
        if (!fd.get("is_active")) fd.set("is_active", "false");
        const result = await updateLabTestAction(null, fd);
        setMessage(result.error ?? "");
        if (!result.error) setEditing(false);
      })} className="lab-test-edit">
        <input name="id" type="hidden" value={test.id} />
        <div className="lab-test-edit__grid">
          <label>Code<input defaultValue={test.code} name="code" required /></label>
          <label>Name<input defaultValue={test.name} name="name" required /></label>
          <label>Specimen<input defaultValue={test.specimen_type ?? ""} name="specimen_type" /></label>
          <label>Unit<input defaultValue={test.default_unit ?? ""} name="default_unit" /></label>
          <label>Reference<input defaultValue={test.reference_range_text ?? ""} name="reference_range_text" /></label>
          <label>Price<input defaultValue={Number(test.price)} min="0" name="price" step="0.01" type="number" required /></label>
          <label>Department<select defaultValue={test.department_id ?? ""} name="department_id"><option value="">General lab</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
          <label className="lab-test-edit__active"><input defaultChecked={test.is_active} name="is_active" type="checkbox" value="true" /> Active (orderable)</label>
        </div>
        <div className="lab-test-edit__actions">
          <button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Saving…" : "Save"}</button>
          <button className="btn btn--secondary btn--compact" onClick={() => setEditing(false)} type="button">Cancel</button>
          {message ? <span className="staff-table-empty">{message}</span> : null}
        </div>
      </form>
      </td></tr>
    );
  }

  return (
    <tr>
      <td>{test.code}</td><td>{test.name}{!test.is_active ? <span className="lab-order-meta__chip" style={{ marginLeft: ".4rem" }}>Pending</span> : null}</td>
      <td>{test.specimen_type ?? "—"}</td><td>{test.default_unit ?? "—"}</td><td>{test.reference_range_text ?? "—"}</td>
      <td className="staff-col-amount">{Number(test.price).toLocaleString()} {test.currency_code}</td>
      {canManage ? <td><button className="btn btn--secondary btn--compact" onClick={() => setEditing(true)} type="button">Edit</button></td> : null}
    </tr>
  );
}
