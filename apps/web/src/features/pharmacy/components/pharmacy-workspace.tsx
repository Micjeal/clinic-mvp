"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelItemAction, createMedicationAction, createPrescriptionAction, dispenseItemAction } from "@/server/actions/pharmacy.actions";

type Encounter = { id: string; started_at: string | null; patients?: { first_name?: string; last_name?: string; patient_number?: string } | null };
type Medication = { id: string; code: string; generic_name: string; brand_name: string | null; strength: string | null; dosage_form: string | null; unit: string | null };
type RxLine = { medication_id: string; medication_name: string; dose: string; frequency: string; duration_days: string; quantity: string; instructions: string };

const EMPTY_LINE: RxLine = { medication_id: "", medication_name: "", dose: "", frequency: "", duration_days: "", quantity: "", instructions: "" };



type StockItem = { id: string; item_name: string; sku: string; unit: string | null; on_hand_quantity: number; medication_id: string | null };

function MedicationCatalogSearch({ medications, stock = {}, stockItems = [], onAdd }: { medications: Medication[]; stock?: Record<string, number>; stockItems?: StockItem[]; onAdd: (entry: { medication_id: string; medication_name?: string; name: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const medMatches = medications.filter((m) => !q || `${m.generic_name} ${m.brand_name ?? ""} ${m.strength ?? ""} ${m.dosage_form ?? ""}`.toLowerCase().includes(q)).slice(0, 8)
    .map((m) => ({ key: `med-${m.id}`, medication_id: m.id, name: `${m.generic_name}${m.strength ? ` ${m.strength}` : ""}`, sub: [m.dosage_form, m.unit].filter(Boolean).join(" · ") || m.code, stock: stock[m.id] ?? 0, unit: m.unit ?? "" }));
  const itemMatches = stockItems.filter((i) => !q || `${i.item_name} ${i.sku}`.toLowerCase().includes(q)).slice(0, 8)
    .map((i) => ({ key: `item-${i.id}`, medication_id: i.medication_id ?? "", name: i.item_name, sub: `${i.sku}${i.unit ? ` · ${i.unit}` : ""}`, stock: Number(i.on_hand_quantity), unit: i.unit ?? "" }));
  const results = [...itemMatches, ...medMatches].slice(0, 12);
  return (
    <div className="med-catalog-search">
      <input onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Search medication catalog to add…" value={query} />
      {open && query.trim().length >= 1 ? (
        <div className="med-catalog-search__drop">
          {results.map((r) => (
            <button className="med-picker__item" key={r.key} onClick={() => { onAdd(r); setQuery(""); setOpen(false); }} type="button">
              <strong>{r.name}</strong>
              <span>{r.sub}</span>
              <em className={`med-stock${r.stock > 0 ? " med-stock--ok" : " med-stock--out"}`}>{r.stock > 0 ? `In stock: ${r.stock}` : "Out of stock"}</em>
            </button>
          ))}
          {results.length === 0 ? <p className="med-picker__empty">No inventory or medication match.</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function MedicationPicker({ medications, stock = {}, value, onPick }: {
  medications: Medication[];
  stock?: Record<string, number>;
  value: { medication_id: string; medication_name: string };
  onPick: (med: Medication | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = medications.find((m) => m.id === value.medication_id);
  const filtered = medications.filter((m) => {
    const q = query.trim().toLowerCase();
    return !q || `${m.generic_name} ${m.brand_name ?? ""} ${m.strength ?? ""} ${m.dosage_form ?? ""}`.toLowerCase().includes(q);
  }).slice(0, 12);
  return (
    <div className="med-picker">
      <button className="med-picker__toggle" onClick={() => setOpen((v) => !v)} type="button">
        {selected ? `${selected.generic_name}${selected.strength ? ` ${selected.strength}` : ""}` : value.medication_name || "Search medication…"}
        <span aria-hidden="true">▾</span>
      </button>
      {open ? (
        <div className="med-picker__drop">
          <input autoFocus onChange={(e) => setQuery(e.target.value)} placeholder="Type to search…" value={query} />
          <div className="med-picker__list">
            {filtered.map((med) => (
              <button className="med-picker__item" key={med.id} onClick={() => { onPick(med); setOpen(false); setQuery(""); }} type="button">
                <strong>{med.generic_name}{med.strength ? ` ${med.strength}` : ""}</strong>
                <span>{[med.dosage_form, med.unit].filter(Boolean).join(" · ") || med.code}</span>
              <em className={`med-stock${(stock[med.id] ?? 0) > 0 ? " med-stock--ok" : " med-stock--out"}`}>{(stock[med.id] ?? 0) > 0 ? `In stock: ${stock[med.id]}` : "Out of stock"}</em>
              </button>
            ))}
            {filtered.length === 0 ? <p className="med-picker__empty">No catalog match — add it under Medications first.</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PrescriptionForm({ encounters, medications, initialEncounterId = "", stock = {}, stockItems = [] }: { encounters: Encounter[]; medications: Medication[]; initialEncounterId?: string; stock?: Record<string, number>; stockItems?: StockItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [lines, setLines] = useState<RxLine[]>([{ ...EMPTY_LINE }]);
  const [encounterId, setEncounterId] = useState(initialEncounterId);
  const [encQuery, setEncQuery] = useState("");
  const [encOpen, setEncOpen] = useState(false);

  const setLine = (index: number, patch: Partial<RxLine>) => setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  const pickMedication = (index: number, medicationId: string) => {
    const med = medications.find((item) => item.id === medicationId);
    setLine(index, { medication_id: medicationId, medication_name: med ? `${med.generic_name}${med.strength ? ` ${med.strength}` : ""}` : "" });
  };

  return (
    <form action={(formData) => startTransition(async () => {
      formData.set("items_json", JSON.stringify(lines.filter((line) => line.medication_name.trim())));
      const result = await createPrescriptionAction(null, formData);
      if (result.error) { setError(result.error); return; }
      if (result.prescriptionId) {
        if (result.allergyWarnings?.length) window.alert(`Allergy warning: this patient has recorded allergies matching — ${result.allergyWarnings.join(", ")}`);
        router.push(`/staff/pharmacy/${result.prescriptionId}`);
      }
    })} className="staff-editor-sections pharmacy-form">
      <section className="staff-editor-section">
        <p className="eyebrow">Prescription</p>
        <h2>New prescription</h2>
        <div className="staff-form-grid">
          <div className="staff-form-grid__wide encounter-picker" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setEncOpen(false); }}>
            <span className="encounter-picker__label">Encounter</span>
            <button aria-expanded={encOpen} className="encounter-picker__toggle" onClick={() => setEncOpen((v) => !v)} type="button">
              {encounterId ? (() => { const e = encounters.find((x) => x.id === encounterId); const p = e?.patients; return p ? `${p.first_name} ${p.last_name}${p.patient_number ? ` (${p.patient_number})` : ""}` : "Encounter selected"; })() : "Choose a patient encounter…"}
              <span className="encounter-picker__chevron" aria-hidden="true">▾</span>
            </button>
            {encOpen ? <>
              <div className="encounter-picker__search"><input autoFocus onChange={(event) => setEncQuery(event.target.value)} placeholder="Search patient name or number…" value={encQuery} /></div>
              <p className="encounter-picker__count">{encounters.filter((encounter) => { const p = encounter.patients; return `${p?.first_name ?? ""} ${p?.last_name ?? ""} ${p?.patient_number ?? ""}`.toLowerCase().includes(encQuery.toLowerCase()); }).length} encounters</p>
              <div className="encounter-picker__list">
                {encounters.filter((encounter) => { const p = encounter.patients; return `${p?.first_name ?? ""} ${p?.last_name ?? ""} ${p?.patient_number ?? ""}`.toLowerCase().includes(encQuery.toLowerCase()); }).slice(0, 30).map((encounter) => {
                  const patient = encounter.patients;
                  const active = encounterId === encounter.id;
                  return (
                    <button className={`encounter-picker__item${active ? " is-active" : ""}`} key={encounter.id} onClick={() => { setEncounterId(encounter.id); setEncQuery(""); setEncOpen(false); }} type="button">
                      <span className="encounter-picker__avatar" aria-hidden="true">{(patient?.first_name?.[0] ?? "P")}{(patient?.last_name?.[0] ?? "")}</span>
                      <span className="encounter-picker__info"><strong>{patient ? `${patient.first_name} ${patient.last_name}` : "Patient"}</strong><small>{patient?.patient_number ?? ""}{encounter.started_at ? ` · ${new Date(encounter.started_at).toLocaleDateString("en-UG")}` : ""}</small></span>
                      {active ? <span className="encounter-picker__check" aria-hidden="true">✓</span> : null}
                    </button>
                  );
                })}
                {encounters.filter((encounter) => { const p = encounter.patients; return `${p?.first_name ?? ""} ${p?.last_name ?? ""} ${p?.patient_number ?? ""}`.toLowerCase().includes(encQuery.toLowerCase()); }).length === 0 ? <p className="encounter-picker__empty">No encounters match.</p> : null}
              </div>
            </> : null}
            <input name="encounter_id" type="hidden" value={encounterId} required />
          </div>
          <label className="staff-form-grid__wide">Notes<textarea name="notes" rows={2} placeholder="Optional clinical note for the pharmacist" /></label>
        </div>
      </section>
      <section className="staff-editor-section">
        <p className="eyebrow">Items</p>
        <h2>Medications ({lines.filter((l) => l.medication_name.trim()).length})</h2>
        <MedicationCatalogSearch medications={medications} stock={stock} stockItems={stockItems} onAdd={(entry) => {
          const name = entry.name;
          const empty = lines.findIndex((l) => !l.medication_name.trim());
          if (empty >= 0) setLine(empty, { medication_id: entry.medication_id, medication_name: name });
          else setLines((prev) => [...prev, { ...EMPTY_LINE, medication_id: entry.medication_id, medication_name: name }]);
        }} />
        <div className="staff-table-wrap"><table className="staff-table rx-table">
          <thead><tr><th>Medication</th><th>Dose</th><th>Frequency</th><th>Days</th><th>Qty</th><th>Instructions</th><th /></tr></thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={index}>
                <td>
                  <MedicationPicker medications={medications} stock={stock} onPick={(med) => pickMedication(index, med?.id ?? "")} value={line} />
                </td>
                <td><input onChange={(e) => setLine(index, { dose: e.target.value })} placeholder="e.g. 500mg" style={{ width: "6rem" }} value={line.dose} /></td>
                <td><input onChange={(e) => setLine(index, { frequency: e.target.value })} placeholder="e.g. BD" style={{ width: "6rem" }} value={line.frequency} /></td>
                <td><input onChange={(e) => setLine(index, { duration_days: e.target.value })} style={{ width: "4.5rem" }} type="number" min="1" value={line.duration_days} /></td>
                <td><input onChange={(e) => setLine(index, { quantity: e.target.value })} style={{ width: "5rem" }} type="number" min="0" step="0.5" value={line.quantity} /></td>
                <td><input onChange={(e) => setLine(index, { instructions: e.target.value })} placeholder="e.g. after meals" style={{ width: "10rem" }} value={line.instructions} /></td>
                <td>{lines.length > 1 ? <button className="btn btn--secondary btn--compact" onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))} type="button">✕</button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <div className="staff-form-actions"><button className="btn btn--secondary btn--compact" onClick={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])} type="button">+ Add medication</button></div>
      </section>
      {error ? <p className="staff-form-message staff-form-message--error" role="alert">{error}</p> : null}
      <div className="staff-form-actions lab-order-actions"><span className="lab-order-actions__hint">{!encounterId ? "Choose a patient encounter" : lines.every((l) => !l.medication_name.trim()) ? "Add at least one medication" : "Ready to create the prescription"}</span><button className="btn" disabled={pending || !encounterId || lines.every((l) => !l.medication_name.trim())} type="submit">{pending ? "Creating…" : "Create prescription"}</button></div>
    </form>
  );
}

export function DispenseButtons({ itemId, prescriptionId, itemStatus, canDispense, canPrescribe }: { itemId: string; prescriptionId: string; itemStatus: string; canDispense: boolean; canPrescribe: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const run = (fn: () => Promise<{ error?: string }>) => startTransition(async () => {
    const result = await fn();
    setMessage(result.error ?? "");
    if (!result.error) window.location.reload();
  });
  if (itemStatus === "cancelled" || itemStatus === "dispensed") return null;
  return (
    <span style={{ display: "inline-flex", gap: ".4rem", flexWrap: "wrap" }}>
      {canDispense ? <button className="btn btn--compact" disabled={pending} onClick={() => run(() => dispenseItemAction(itemId, prescriptionId))} type="button">Dispense</button> : null}
      {canPrescribe ? <button className="btn btn--secondary btn--compact" disabled={pending} onClick={() => { if (window.confirm("Cancel this item?")) run(() => cancelItemAction(itemId, prescriptionId)); }} type="button">Cancel</button> : null}
      {message ? <span className="staff-table-empty">{message}</span> : null}
    </span>
  );
}

export function MedicationForm({ canManage }: { canManage: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  if (!canManage) return null;
  return (
    <form action={(formData) => startTransition(async () => {
      const result = await createMedicationAction(null, formData);
      setMessage(result.error ?? "Medication added.");
      if (!result.error) window.location.reload();
    })} className="staff-form-grid" style={{ marginBottom: "1.25rem" }}>
      <label>Code<input name="code" placeholder="e.g. AMX-500" required /></label>
      <label>Generic name<input name="generic_name" placeholder="Amoxicillin" required /></label>
      <label>Brand name<input name="brand_name" /></label>
      <label>Dosage form<input name="dosage_form" placeholder="Tablet" /></label>
      <label>Strength<input name="strength" placeholder="500mg" /></label>
      <label>Unit<input name="unit" placeholder="tablet" /></label>
      <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Adding…" : "Add medication"}</button>{message ? <span className="staff-table-empty">{message}</span> : null}</div>
    </form>
  );
}
