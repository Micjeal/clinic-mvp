"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addPatientAllergyAction } from "@/server/actions/patient-staff.actions";

export function AllergyForm({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  if (!open) return <button className="btn btn--compact" onClick={() => setOpen(true)} type="button">+ Add allergy</button>;

  return (
    <form action={(formData) => startTransition(async () => {
      formData.set("patient_id", patientId);
      const result = await addPatientAllergyAction(null, formData);
      if (result.error) { setError(result.error); return; }
      setOpen(false);
      router.refresh();
    })} className="staff-form-grid" style={{ marginTop: ".75rem" }}>
      <input name="allergen" placeholder="Allergen (e.g. Penicillin)" required />
      <input name="reaction" placeholder="Reaction (e.g. rash, anaphylaxis)" />
      <select name="severity" defaultValue="moderate"><option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option></select>
      <input name="notes" placeholder="Notes (optional)" />
      <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Saving…" : "Save allergy"}</button><button className="btn btn--secondary btn--compact" onClick={() => setOpen(false)} type="button">Cancel</button>{error ? <span className="staff-table-empty">{error}</span> : null}</div>
    </form>
  );
}
