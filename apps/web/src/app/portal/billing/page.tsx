import { Wallet } from "lucide-react";
import { requirePatient } from "@/server/auth/require-patient";
import { createAdminClient } from "@/lib/supabase/admin";
import { PatientPageHeader } from "@/features/patient/components/patient-content";

export const metadata = { title: "Billing & Results" };

export default async function PortalBillingPage() {
  const { patient } = await requirePatient();
  const admin = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
  const [invoicesRes, labRes, imagingRes] = await Promise.all([
    admin.from("invoices").select("id,invoice_number,status,currency_code,total,balance,issued_at").eq("patient_id", patient.id).order("created_at", { ascending: false }).limit(50),
    admin.from("lab_results").select("id,result_value,unit,reference_range,abnormal_flag,result_text,resulted_at,lab_order_items!inner(lab_orders!inner(patient_id))").eq("lab_order_items.lab_orders.patient_id", patient.id).eq("patient_visible", true).order("resulted_at", { ascending: false }).limit(50),
    admin.from("imaging_reports").select("id,findings,impression,status,patient_visible,reported_at,imaging_orders!inner(patient_id)").eq("imaging_orders.patient_id", patient.id).eq("patient_visible", true).order("reported_at", { ascending: false }).limit(50),
  ]);
  const invoices = invoicesRes.data ?? [];
  const labResults = labRes.data ?? [];
  const imagingReports = imagingRes.data ?? [];

  return (
    <div className="patient-portal-page">
      <PatientPageHeader eyebrow="Billing" title="Billing & Results" description="Your invoices and released test results." />

      <div className="billing-summary">
        <div className="billing-summary__card"><span>Invoices</span><strong>{invoices.length}</strong></div>
        <div className="billing-summary__card"><span>Outstanding</span><strong>{invoices.reduce((sum, i) => sum + Number(i.balance), 0).toLocaleString()} UGX</strong></div>
        <div className="billing-summary__card"><span>Lab results</span><strong>{labResults.length}</strong></div>
        <div className="billing-summary__card"><span>Imaging reports</span><strong>{imagingReports.length}</strong></div>
      </div>

      <section className="patient-section">
        <div className="patient-section-heading"><div><p className="eyebrow">Payments</p><h2>Invoices</h2></div></div>
        {invoices.length === 0 ? <div className="patient-empty-state"><Wallet aria-hidden="true" /><div><h3>No invoices yet</h3><p>Charges for your visits will appear here once billed.</p></div></div> : (
          <div className="patient-table-wrap"><table className="patient-table">
            <thead><tr><th>Invoice</th><th>Status</th><th className="patient-col-amount">Total</th><th className="patient-col-amount">Balance</th><th>Issued</th></tr></thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td><strong>{inv.invoice_number}</strong></td>
                  <td><span className={`patient-status patient-status--${inv.status}`}>{String(inv.status).replace("_", " ")}</span></td>
                  <td>{Number(inv.total).toLocaleString()} {inv.currency_code}</td>
                  <td>{Number(inv.balance).toLocaleString()} {Number(inv.balance) > 0 ? inv.currency_code : ""}</td>
                  <td>{inv.issued_at ? new Date(inv.issued_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>

      <section className="patient-section">
        <div className="patient-section-heading"><div><p className="eyebrow">Diagnostics</p><h2>Lab results</h2></div></div>
        {labResults.length === 0 ? <p className="patient-empty">No released lab results.</p> : (
          <ul className="patient-list">
            {labResults.map((r) => (
              <li key={r.id} className="patient-list-item">
                <strong>{r.result_value ?? r.result_text ?? "Result"}</strong>{r.unit ? ` ${r.unit}` : ""}
                {r.reference_range ? <span className="patient-sub"> · ref {r.reference_range}</span> : null}
                {r.abnormal_flag && r.abnormal_flag !== "normal" ? <span className="patient-flag"> {r.abnormal_flag}</span> : null}
                <span className="patient-sub"> · {r.resulted_at ? new Date(r.resulted_at).toLocaleDateString() : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="patient-section">
        <div className="patient-section-heading"><div><p className="eyebrow">Diagnostics</p><h2>Imaging reports</h2></div></div>
        {imagingReports.length === 0 ? <p className="patient-empty">No released imaging reports.</p> : (
          <ul className="patient-list">
            {imagingReports.map((r) => (
              <li key={r.id} className="patient-list-item">
                <strong>{r.impression ?? r.findings ?? "Report"}</strong>
                <span className="patient-sub"> · {r.reported_at ? new Date(r.reported_at).toLocaleDateString() : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
