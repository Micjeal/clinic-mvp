"use client";

import { useTransition } from "react";
import { activateLabTestAction } from "@/server/actions/settings.actions";

type Test = { id: string; code: string; name: string; price: number };

export function PendingLabTests({ tests }: { tests: Test[] }) {
  const [pending, startTransition] = useTransition();
  if (!tests.length) return <p className="staff-table-empty">No pending test requests.</p>;
  return (
    <ul className="staff-table-list">
      {tests.map((test) => (
        <li key={test.id}>
          <span><strong>{test.name}</strong><small>{test.code}</small></span>
          <span>{Number(test.price).toLocaleString()} UGX</span>
          <button className="btn" disabled={pending} onClick={() => startTransition(async () => { await activateLabTestAction(test.id); })} type="button">Activate</button>
        </li>
      ))}
    </ul>
  );
}
