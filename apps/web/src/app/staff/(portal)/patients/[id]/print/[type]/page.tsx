import { notFound } from "next/navigation";
import { getPatientRecord } from "@/server/services/patient-records.service";
import { AuthorizationError } from "@/server/errors";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { PrintButton } from "@/features/patients/components/print-button";

export const metadata = { title: "Print document" };

export default async function PrintDocumentPage({ params }: { params: Promise<{ id: string; type: string }> }) {
  const { id, type } = await params;
  if (type !== "referral" && type !== "discharge") notFound();
  let record;
  try {
    record = await getPatientRecord(id);
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  const { patient, timeline } = record;
  const name = `${patient.first_name} ${patient.middle_name ? `${patient.middle_name} ` : ""}${patient.last_name}`;
  const today = new Date().toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" });
  const latestEncounter = timeline.encounters[0] as { started_at?: string; chief_complaint?: string | null } | undefined;
  const diagnoses = timeline.diagnoses.slice(0, 5) as { name?: string; icd_code?: string | null }[];
  const notes = timeline.notes.slice(0, 3) as { content?: string; created_at?: string }[];
  const admission = timeline.admissions[0] as { admitted_at?: string; discharged_at?: string | null; ward?: { name?: string } | null; beds?: { bed_number?: string } | null } | undefined;

  return (
    <div className="print-page">
      <style>{`@media print { .no-print { display: none !important; } body { margin: 0; } } .print-page { max-width: 800px; margin: 2rem auto; padding: 2.5rem; background: #fff; font-family: Georgia, serif; color: #111; } .print-header { display: flex; justify-content: space-between; border-bottom: 3px solid #0d9488; padding-bottom: 1rem; margin-bottom: 1.5rem; } .print-title { font-size: 1.4rem; font-weight: bold; text-transform: uppercase; letter-spacing: .05em; } .print-meta { font-size: .85rem; color: #444; } .print-section { margin-bottom: 1.25rem; } .print-label { font-size: .75rem; text-transform: uppercase; letter-spacing: .08em; color: #0d9488; font-weight: bold; margin-bottom: .25rem; } .print-body { font-size: .95rem; line-height: 1.6; white-space: pre-wrap; } .print-sign { margin-top: 3rem; display: flex; justify-content: space-between; } .print-sign div { width: 40%; border-top: 1px solid #333; padding-top: .4rem; font-size: .85rem; }`}</style>
      <div className="no-print" style={{ marginBottom: "1rem", display: "flex", gap: ".75rem" }}>
        <PrintButton />
        <a className="btn btn--secondary" href={`/staff/patients/${id}`}>Back to record</a>
      </div>

      <div className="print-header">
        <div>
          <div className="print-title">{type === "referral" ? "Referral Letter" : "Discharge Summary"}</div>
          <div className="print-meta">Date: {today}</div>
        </div>
        <div className="print-meta" style={{ textAlign: "right" }}>
          <div><strong>Patient:</strong> {name}</div>
          <div><strong>Patient No:</strong> {patient.patient_number}</div>
          <div><strong>DOB:</strong> {patient.date_of_birth ?? "—"} · <strong>Sex:</strong> {patient.sex ?? "—"}</div>
          {patient.phone ? <div><strong>Phone:</strong> {patient.phone}</div> : null}
        </div>
      </div>

      {type === "referral" ? (
        <>
          <div className="print-section"><div className="print-label">Reason for referral</div><div className="print-body">{latestEncounter?.chief_complaint ?? "Specialist evaluation and ongoing management."}</div></div>
          <div className="print-section"><div className="print-label">Clinical summary</div><div className="print-body">{diagnoses.length ? diagnoses.map((d) => `• ${d.name}${d.icd_code ? ` (${d.icd_code})` : ""}`).join("\n") : "No diagnoses recorded."}{notes.length ? `\n\nLatest notes:\n${notes.map((n) => `• ${n.content}`).join("\n")}` : ""}</div></div>
          <div className="print-section"><div className="print-label">To</div><div className="print-body">{`[Specialist / Facility name]\n[Address]\nDear Colleague,`}</div></div>
          <div className="print-body">Please review this patient and advise on further management. Relevant records available on request.</div>
        </>
      ) : (
        <>
          <div className="print-section"><div className="print-label">Admission</div><div className="print-body">{admission ? `${admission.ward?.name ?? "Ward"} — bed ${admission.beds?.bed_number ?? "—"}\nAdmitted: ${admission.admitted_at ? new Date(admission.admitted_at).toLocaleDateString() : "—"}\nDischarged: ${admission.discharged_at ? new Date(admission.discharged_at).toLocaleDateString() : "—"}` : "No admission on record."}</div></div>
          <div className="print-section"><div className="print-label">Diagnoses</div><div className="print-body">{diagnoses.length ? diagnoses.map((d) => `• ${d.name}${d.icd_code ? ` (${d.icd_code})` : ""}`).join("\n") : "None recorded."}</div></div>
          <div className="print-section"><div className="print-label">Course in hospital</div><div className="print-body">{notes.length ? notes.map((n) => `• ${n.content}`).join("\n") : "No clinical notes recorded."}</div></div>
          <div className="print-section"><div className="print-label">Discharge medications & instructions</div><div className="print-body">{timeline.prescriptions.length ? timeline.prescriptions.slice(0, 5).map((rx) => `• ${(rx as { prescription_items?: { medication_name?: string }[] }).prescription_items?.map((i) => i.medication_name).filter(Boolean).join(", ") ?? "Prescription"}`).join("\n") : "None recorded."}{"\n\nReturn to clinic if symptoms worsen."}</div></div>
        </>
      )}

      <div className="print-sign">
        <div>Referring clinician</div>
        <div>Signature / Date</div>
      </div>
    </div>
  );
}
