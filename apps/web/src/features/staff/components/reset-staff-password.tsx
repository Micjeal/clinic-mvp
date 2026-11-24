"use client";

import { useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { resetStaffPasswordAction } from "@/server/actions/staff-management.actions";

export function ResetStaffPassword({ membershipId, memberName }: { membershipId: string; memberName: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ temporaryPassword?: string; error?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    if (!window.confirm(`Reset the password for ${memberName}? They will be required to set a new password at next sign-in.`)) return;
    startTransition(async () => {
      const outcome = await resetStaffPasswordAction(membershipId);
      setResult(outcome);
      setCopied(false);
    });
  };

  if (result?.temporaryPassword) {
    return (
      <div className="staff-reset-password">
        <p className="staff-form-message staff-form-message--success" role="status">
          New temporary password — shown once. Give it to {memberName} securely.
        </p>
        <div className="staff-reset-password__value">
          <code>{result.temporaryPassword}</code>
          <button
            className="btn btn--secondary btn--compact"
            onClick={async () => {
              await navigator.clipboard.writeText(result.temporaryPassword!);
              setCopied(true);
            }}
            type="button"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="staff-reset-password">
      <button className="btn btn--secondary btn--compact" disabled={pending} onClick={reset} type="button">
        <KeyRound aria-hidden="true" />
        {pending ? "Resetting…" : "Reset password"}
      </button>
      {result?.error ? <p className="staff-form-message staff-form-message--error" role="alert">{result.error}</p> : null}
    </div>
  );
}
