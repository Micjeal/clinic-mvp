import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { listBillingInvoices, listUnbilledCharges } from "@/server/services/billing.service";
import { listOrgFacilities } from "@/server/repositories/billing.repository";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { UnbilledCharges } from "@/features/billing/components/unbilled-charges";
import { AuthorizationError } from "@/server/errors";
import Link from "next/link";
import { ReceiptText } from "lucide-react";

export const metadata = { title: "Billing" };

const STATUS_LABELS: Record<string, string> = { draft: "Draft", issued: "Issued", partially_paid: "Part paid", paid: "Paid", void: "Void", refunded: "Refunded" };

export default async function BillingPage() {
  let invoices;
  try {
    invoices = await listBillingInvoices();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  let charges: Awaited<ReturnType<typeof listUnbilledCharges>> = [];
  let facilities: { id: string; name: string }[] = [];
  try {
    const staff = await requirePermission(Permissions.BILLING_READ);
    [charges, facilities] = await Promise.all([listUnbilledCharges(), listOrgFacilities(staff.membership.organization_id)]);
  } catch { /* unbilled section optional */ }
  const outstanding = invoices.filter((i) => i.balance > 0 && i.status !== "void").reduce((s, i) => s + Number(i.balance), 0);
  const collected = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total), 0);

  return (
    <div className="staff-page">
      <div className="staff-page-heading staff-page-heading--doctor lab-order-heading">
        <div className="staff-doctor-avatar lab-order-heading__icon" aria-hidden="true"><ReceiptText size={26} /></div>
        <div className="doctor-identity-copy">
          <p className="eyebrow">Finance</p>
          <h1>Billing</h1>
          <p>Unbilled charges accumulate automatically — review, confirm and invoice.</p>
        </div>
        <div className="staff-page-heading__actions"><Link className="btn" href="/staff/billing/new">New invoice</Link></div>
      </div>
      <div className="staff-kpi-grid">
        <div className="staff-kpi"><span>Invoices</span><strong>{invoices.length}</strong></div>
        <div className="staff-kpi"><span>Collected</span><strong>{collected.toLocaleString()} UGX</strong></div>
        <div className="staff-kpi"><span>Outstanding</span><strong>{outstanding.toLocaleString()} UGX</strong></div>
      </div>
      <section className="staff-panel billing-panel">
        <div className="staff-panel__header"><h2>Unbilled charges</h2><span className="staff-table-sub">{charges.length} pending — auto-captured from lab, imaging and pharmacy</span></div>
        <UnbilledCharges charges={charges as never} facilities={facilities} />
      </section>
      <section className="staff-panel billing-panel">
        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead><tr><th>Invoice</th><th>Patient</th><th>Status</th><th className="staff-col-amount">Total</th><th className="staff-col-amount">Balance</th><th>Issued</th></tr></thead>
            <tbody>
              {invoices.length === 0 ? <tr><td colSpan={6} className="staff-table-empty">No invoices yet. Create the first one to start billing.</td></tr> :
                invoices.map((invoice) => {
                  const patient = invoice.patients as { first_name?: string; last_name?: string; patient_number?: string } | null;
                  return (
                    <tr key={invoice.id}>
                      <td><Link className="staff-table-link" href={`/staff/billing/${invoice.id}`}>{invoice.invoice_number}</Link></td>
                      <td>{patient ? `${patient.first_name} ${patient.last_name}` : "—"}{patient?.patient_number ? <span className="staff-table-sub"> {patient.patient_number}</span> : null}</td>
                      <td><span className={`staff-status staff-status--${invoice.status}`}>{STATUS_LABELS[invoice.status] ?? invoice.status}</span></td>
                      <td className="staff-col-amount">{Number(invoice.total).toLocaleString()} {invoice.currency_code}</td>
                      <td className="staff-col-amount">{Number(invoice.balance).toLocaleString()} {invoice.balance > 0 ? invoice.currency_code : ""}</td>
                      <td>{invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString() : "—"}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
