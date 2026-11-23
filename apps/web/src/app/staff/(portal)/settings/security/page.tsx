import Link from "next/link";
import { ShieldCheck, Users } from "lucide-react";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { StaffPageHeader, StaffSection } from "@/features/staff/components/staff-content";
import { AuthorizationError } from "@/server/errors";
import { getSettingsContext } from "@/server/services/settings.service";

export const metadata = { title: "Security & access · Settings" };

export default async function SecuritySettingsPage() {
  let context;
  try {
    context = await getSettingsContext();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }

  return (
    <div className="staff-page">
      <StaffPageHeader
        eyebrow="Settings"
        title="Security & access"
        description="Authentication and access controls for your organization."
      />
      <StaffSection title="Authentication" eyebrow="Supabase Auth" description="Passwords, sessions and multi-factor controls are managed by Supabase Auth and cannot be overridden per-organization.">
        <dl className="staff-settings-summary">
          <div><dt>Password policy</dt><dd>Managed by Supabase Auth project settings</dd></div>
          <div><dt>Sessions</dt><dd>Managed by Supabase Auth — sign out from the account menu</dd></div>
          <div><dt>Email verification</dt><dd>Required at registration</dd></div>
          <div><dt>Row-level security</dt><dd>Enforced on every organization-scoped table</dd></div>
        </dl>
      </StaffSection>
      <StaffSection title="Access review" eyebrow="Staff accounts" description="Review who can sign in and what they can do.">
        <ul className="staff-settings-links">
          <li>
            <ShieldCheck aria-hidden="true" />
            <div>
              <strong>Staff directory</strong>
              <small>Activate, suspend and assign roles to staff accounts.</small>
            </div>
            <Link className="staff-table-action" href="/staff/users">Open staff directory</Link>
          </li>
          <li>
            <Users aria-hidden="true" />
            <div>
              <strong>Audit log</strong>
              <small>Review every administrative change made to settings.</small>
            </div>
            <Link className="staff-table-action" href="/staff/settings/audit">View audit log</Link>
          </li>
        </ul>
      </StaffSection>
    </div>
  );
}
