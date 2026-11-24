"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createExpenseAction, updateExpenseStatusAction } from "@/server/actions/expenses.actions";

type Expense = { id: string; category: string; description: string; amount: number; currency_code: string; expense_date: string; status: string; payment_method: string | null; reference: string | null; facilities?: { name?: string } | null };

const STATUS_TONE: Record<string, string> = { recorded: "", approved: "staff-status--info", paid: "staff-status--success", void: "staff-status--danger" };
const CATEGORIES = ["Salaries", "Utilities", "Medical supplies", "Equipment", "Rent", "Insurance", "Transport", "Other"];

export function ExpensesWorkspace({ items, facilities, canManage }: { items: Expense[]; facilities: { id: string; name: string }[]; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const run = (fn: () => Promise<{ error?: string } | undefined>) => startTransition(async () => {
    const result = await fn();
    if (result?.error) setError(result.error); else { setError(""); router.refresh(); }
  });
  const setStatus = (id: string, status: string) => { const fd = new FormData(); fd.set("expense_id", id); fd.set("status", status); run(() => updateExpenseStatusAction(null, fd)); };

  const total = items.filter((i) => i.status !== "void").reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div>
      {canManage ? (
        <section className="staff-editor-section" style={{ marginBottom: "1.25rem" }}>
          <p className="eyebrow">Finance</p><h2>Record expense</h2>
          <form action={(fd) => run(() => createExpenseAction(null, fd))} className="staff-form-grid">
            <select name="category" required><option value="">Category…</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
            <input name="description" placeholder="Description" required />
            <input name="amount" type="number" step="0.01" min="0" placeholder="Amount" required />
            <input name="expense_date" type="date" />
            <select name="facility_id"><option value="">Facility (optional)…</option>{facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
            <input name="payment_method" placeholder="Payment method (cash/bank/mobile)" />
            <input name="reference" placeholder="Reference / receipt no." />
            <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Saving…" : "Record"}</button></div>
          </form>
        </section>
      ) : null}
      {error ? <p className="staff-table-empty">{error}</p> : null}

      <section className="staff-panel">
        <div className="staff-panel__header"><h2>Expenses</h2><span className="staff-table-sub">{items.length} · total {total.toLocaleString()} UGX</span></div>
        <div className="staff-table-wrap"><table className="staff-table">
          <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Facility</th><th className="staff-col-amount">Amount</th><th>Status</th>{canManage ? <th>Actions</th> : null}</tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={7} className="staff-table-empty">No expenses recorded.</td></tr> : items.map((e) => (
              <tr key={e.id}>
                <td>{new Date(e.expense_date).toLocaleDateString()}</td>
                <td>{e.category}</td>
                <td>{e.description}{e.reference ? <span className="staff-table-sub"> · {e.reference}</span> : null}</td>
                <td>{e.facilities?.name ?? "—"}</td>
                <td className="staff-col-amount">{Number(e.amount).toLocaleString()} {e.currency_code}</td>
                <td><span className={`staff-status ${STATUS_TONE[e.status] ?? ""}`}>{e.status}</span></td>
                {canManage ? <td><div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
                  {e.status === "recorded" ? <button className="btn btn--secondary btn--compact" onClick={() => setStatus(e.id, "approved")} type="button">Approve</button> : null}
                  {e.status === "approved" ? <button className="btn btn--secondary btn--compact" onClick={() => setStatus(e.id, "paid")} type="button">Mark paid</button> : null}
                  {e.status !== "void" && e.status !== "paid" ? <button className="btn btn--secondary btn--compact" onClick={() => setStatus(e.id, "void")} type="button">Void</button> : null}
                </div></td> : null}
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>
    </div>
  );
}
