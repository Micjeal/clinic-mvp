import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { StaffPageHeader, StaffSection } from "@/features/staff/components/staff-content";
import { AuthorizationError } from "@/server/errors";
import { getSettingsContext } from "@/server/services/settings.service";
import { SettingsBackLink } from "@/features/settings/components/settings-back-link";
import { ReceiptText } from "lucide-react";
import { ChargeCatalog } from "@/features/settings/components/charge-catalog";
import { listStandardCharges } from "@/server/repositories/charge.repository";
import { createClient } from "@/lib/supabase/server";
import { PendingLabTests } from "@/features/settings/components/pending-lab-tests";

export const metadata = { title: "Billing & payments · Settings" };

const METHODS = ["Cash", "Card", "Mobile money", "Bank transfer", "Insurance", "Other"];

async function pendingTests(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("lab_tests").select("id,code,name,price").eq("organization_id", orgId).eq("is_active", false).order("created_at", { ascending: false }).limit(50);
  return data ?? [];
}

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
      <SettingsBackLink />
      <div className="staff-page-heading staff-page-heading--doctor lab-order-heading">
        <div className="staff-doctor-avatar lab-order-heading__icon" aria-hidden="true"><ReceiptText size={26} /></div>
        <div className="doctor-identity-copy">
          <p className="eyebrow">Settings</p>
          <h1>Billing & payments</h1>
          <p>Currency, payment methods and the standard charge catalog used for automatic billing.</p>
        </div>
      </div>
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
      <StaffSection className="billing-settings-panel" title="Standard charges" eyebrow="Catalog" description="Stable fees used for automatic charge capture — consultation, triage, bed-day and procedures. Changing a price here affects new charges only.">
        <ChargeCatalog charges={await listStandardCharges(context.organization.id)} />
      </StaffSection>
      <StaffSection title="Pending lab tests" eyebrow="Approval" description="Tests requested by clinicians stay inactive until approved here.">
        <PendingLabTests tests={await pendingTests(context.organization.id)} />
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
