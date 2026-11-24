"use client";

import { useState, useTransition } from "react";
import { issueInvoiceAction, recordPaymentAction, voidInvoiceAction } from "@/server/actions/billing.actions";

export function InvoiceActions({ invoiceId, status, canVoid }: { invoiceId: string; status: string; canVoid: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const run = (fn: () => Promise<{ error?: string; success?: boolean }>) => startTransition(async () => {
    const result = await fn();
    setMessage(result.error ?? "Done — refresh if the status didn't update.");
  });
  return (
    <section className="staff-panel">
      <div className="staff-panel__header"><h2>Invoice actions</h2></div>
      <div className="staff-form-actions" style={{ flexWrap: "wrap" }}>
        {status === "draft" ? <button className="btn btn--compact" disabled={pending} onClick={() => run(() => issueInvoiceAction(invoiceId))} type="button">Issue invoice</button> : null}
        {canVoid && status !== "void" ? <button className="btn btn--secondary btn--compact" disabled={pending} onClick={() => { if (window.confirm("Void this invoice?")) run(() => voidInvoiceAction(invoiceId)); }} type="button">Void</button> : null}
      </div>
      {message ? <p className="staff-table-empty">{message}</p> : null}
    </section>
  );
}

export function PaymentForm({ invoiceId, balance, currency }: { invoiceId: string; balance: number; currency: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <section className="staff-panel">
      <div className="staff-panel__header"><h2>Record payment</h2><span className="staff-table-sub">Balance {balance.toLocaleString()} {currency}</span></div>
      <form
        action={(formData) => startTransition(async () => {
          const result = await recordPaymentAction(null, formData);
          setMessage(result.error ?? "Payment recorded.");
          if (!result.error) (document.getElementById("payment-form") as HTMLFormElement | null)?.reset();
        })}
        className="staff-form-grid"
        id="payment-form"
      >
        <input name="invoice_id" type="hidden" value={invoiceId} />
        <label>Amount<input defaultValue={balance} min="0.01" name="amount" step="0.01" type="number" required /></label>
        <label>Method<select name="payment_method" required>
          <option value="cash">Cash</option><option value="card">Card</option><option value="mobile_money">Mobile money</option>
          <option value="bank_transfer">Bank transfer</option><option value="insurance">Insurance</option><option value="other">Other</option>
        </select></label>
        <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Recording…" : "Record payment"}</button></div>
      </form>
      {message ? <p className="staff-table-empty">{message}</p> : null}
    </section>
  );
}
