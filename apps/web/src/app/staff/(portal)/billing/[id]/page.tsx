import { notFound } from "next/navigation";
import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getBillingInvoice } from "@/server/services/billing.service";
import { Permissions } from "@clinic/permissions";
import { requirePermission } from "@/server/permissions/require-permission";
import { AuthorizationError, NotFoundError } from "@/server/errors";
import { InvoiceActions, PaymentForm } from "@/features/billing/components/invoice-actions";
import Link from "next/link";

export const metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data;
  try {
    data = await getBillingInvoice(id);
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  const { invoice, payments } = data;
  const items = (invoice.invoice_items ?? []) as { id: string; description: string; quantity: number; unit_price: number; line_total: number }[];
  const patient = invoice.patients as { first_name?: string; last_name?: string; patient_number?: string } | null;
  const facility = invoice.facilities as { name?: string } | null;
  const canInvoice = await requirePermission(Permissions.BILLING_INVOICE_CREATE).then(() => true).catch(() => false);
  const canPay = await requirePermission(Permissions.BILLING_PAYMENT_CREATE).then(() => true).catch(() => false);
  const payable = ["issued", "partially_paid"].includes(invoice.status) && Number(invoice.balance) > 0;

  return (
    <div className="staff-page">
      <StaffPageHeader eyebrow="Finance" title={invoice.invoice_number} description={`${patient ? `${patient.first_name} ${patient.last_name}` : "Patient"} • ${facility?.name ?? ""}`} actions={<Link className="btn btn--secondary" href="/staff/billing">← Back to billing</Link>} />
      <div className="staff-detail-grid">
        <section className="staff-panel">
          <div className="staff-panel__header"><h2>Line items</h2><span className={`staff-status staff-status--${invoice.status}`}>{invoice.status.replace("_", " ")}</span></div>
          <div className="staff-table-wrap"><table className="staff-table">
            <thead><tr><th>Description</th><th>Qty</th><th className="staff-col-amount">Unit</th><th className="staff-col-amount">Total</th></tr></thead>
            <tbody>{items.map((item) => (
              <tr key={item.id}><td>{item.description}</td><td>{Number(item.quantity)}</td><td className="staff-col-amount">{Number(item.unit_price).toLocaleString()}</td><td className="staff-col-amount">{Number(item.line_total).toLocaleString()}</td></tr>
            ))}</tbody>
          </table></div>
          <dl className="staff-detail-list">
            <div><dt>Subtotal</dt><dd>{Number(invoice.subtotal).toLocaleString()} {invoice.currency_code}</dd></div>
            <div><dt>Tax</dt><dd>{Number(invoice.tax_total).toLocaleString()} {invoice.currency_code}</dd></div>
            <div><dt>Total</dt><dd><strong>{Number(invoice.total).toLocaleString()} {invoice.currency_code}</strong></dd></div>
            <div><dt>Balance</dt><dd><strong>{Number(invoice.balance).toLocaleString()} {invoice.currency_code}</strong></dd></div>
          </dl>
        </section>
        <div className="staff-detail-side">
          {canInvoice ? <InvoiceActions canVoid={invoice.status !== "paid" && invoice.status !== "void"} invoiceId={invoice.id} status={invoice.status} /> : null}
          {canPay && payable ? <PaymentForm balance={Number(invoice.balance)} currency={invoice.currency_code} invoiceId={invoice.id} /> : null}
          <section className="staff-panel">
            <div className="staff-panel__header"><h2>Payments</h2></div>
            {payments.length === 0 ? <p className="staff-table-empty">No payments recorded.</p> : (
              <ul className="staff-simple-list">{payments.map((payment) => (
                <li key={payment.id}><span>{Number(payment.amount).toLocaleString()} {payment.currency_code}</span><span>{payment.payment_method.replace("_", " ")} • {new Date(payment.paid_at).toLocaleDateString()}</span></li>
              ))}</ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
