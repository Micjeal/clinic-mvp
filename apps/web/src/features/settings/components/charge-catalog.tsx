"use client";

import { useActionState, useState } from "react";
import { saveStandardChargeAction, deactivateStandardChargeAction } from "@/server/actions/settings.actions";

const CATEGORIES = ["consultation","triage","procedure","bed_day","registration","other"] as const;

type Charge = { id: string; name: string; category: string; price: number; is_active: boolean };

export function ChargeCatalog({ charges }: { charges: Charge[] }) {
  const [state, action] = useActionState(saveStandardChargeAction, null);
  const [editing, setEditing] = useState<Charge | null>(null);
  const [pending, setPending] = useState(false);

  const edit = (charge: Charge) => setEditing(charge);

  const deactivate = async (id: string) => {
    setPending(true);
    try { await deactivateStandardChargeAction(id); } finally { setPending(false); }
  };

  return (
    <div>
      <ul className="charge-catalog-list">
        {charges.map((charge) => (
          <li className="charge-catalog-row" key={charge.id}>
            <span className="charge-catalog-row__name"><strong>{charge.name}</strong><small>{charge.category.replace("_"," ")}</small></span>
            <span className="charge-catalog-row__price">{Number(charge.price).toLocaleString()} UGX</span>
            <span className={`charge-status ${charge.is_active ? "charge-status--active" : "charge-status--inactive"}`}>{charge.is_active ? "Active" : "Inactive"}</span>
            <span className="charge-catalog-row__actions">
              <button className="btn btn--secondary btn--compact" onClick={() => edit(charge)} type="button">Edit</button>
              {charge.is_active ? <button className="btn btn--secondary btn--compact" disabled={pending} onClick={() => deactivate(charge.id)} type="button">Deactivate</button> : null}
            </span>
          </li>
        ))}
        {charges.length === 0 ? <li className="staff-table-empty">No standard charges yet — add consultation, triage and procedure fees below.</li> : null}
      </ul>

      <form action={action} className="staff-form-grid charge-form" key={editing?.id ?? "new"}>
        <input name="id" type="hidden" value={editing?.id ?? ""} />
        <label>Name<input defaultValue={editing?.name ?? ""} name="name" placeholder="e.g. Consultation fee" required /></label>
        <label>Category<select defaultValue={editing?.category ?? "consultation"} name="category">{CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_"," ")}</option>)}</select></label>
        <label>Price (UGX)<input defaultValue={editing ? Number(editing.price) : ""} min="0" name="price" step="0.01" type="number" required /></label>
        <label className="charge-form__active"><input defaultChecked={editing?.is_active ?? true} name="is_active" type="checkbox" value="true" /> <span>Active — include in automatic charges</span></label>
        <div className="staff-form-actions">
          <button className="btn" type="submit">{editing ? "Save changes" : "Add charge"}</button>
          {editing ? <button className="btn btn--secondary" onClick={() => setEditing(null)} type="button">Cancel</button> : null}
        </div>
        {state?.error ? <p className="error" role="alert">{state.error}</p> : null}
        {state?.success ? <p className="success">{state.success}</p> : null}
      </form>
    </div>
  );
}
