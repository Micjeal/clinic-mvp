import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { StaffPageHeader, StaffSection } from "@/features/staff/components/staff-content";
import { AuthorizationError } from "@/server/errors";
import { getSettingsContext } from "@/server/services/settings.service";

export const metadata = { title: "Billing & payments · Settings" };

const METHODS = ["Cash", "Card", "Mobile money", "Bank transfer", "Insurance", "Other"];

export default async function BillingSettingsPage() {
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
        title="Billing & payments"
        description="Currency and payment configuration for your organization."
      />
      <StaffSection title="Currency" eyebrow="Organization" description="Set under Organization profile. It applies to new invoices and payments only.">
        <dl className="staff-settings-summary">
          <div><dt>Billing currency</dt><dd>{context.organization.currency_code}</dd></div>
          <div><dt>Historical records</dt><dd>Each invoice and payment stores its own currency — past transactions are never converted.</dd></div>
        </dl>
      </StaffSection>
      <StaffSection title="Payment methods" eyebrow="Recording" description="Payments are recorded manually by staff. No online payment provider is connected.">
        <ul className="staff-settings-chips">
          {METHODS.map((method) => <li key={method}>{method}</li>)}
        </ul>
      </StaffSection>
      <StaffSection title="Provider integration" eyebrow="Status">
        <dl className="staff-settings-summary">
          <div><dt>Payment gateway</dt><dd>Not configured — invoices are settled at the front desk</dd></div>
          <div><dt>Tax engine</dt><dd>Not configured — tax is entered per invoice line where used</dd></div>
        </dl>
      </StaffSection>
    </div>
  );
}
