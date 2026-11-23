import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { AuthorizationError } from "@/server/errors";
import { Permissions } from "@/server/permissions/permission.constants";
import { getSettingsContext } from "@/server/services/settings.service";
import { updateOrganizationProfileAction } from "@/server/actions/settings.actions";
import { SettingsBackLink } from "@/features/settings/components/settings-back-link";

export const metadata = { title: "Organization profile · Settings" };


export default async function OrganizationSettingsPage() {
  let context;
  try {
    context = await getSettingsContext(Permissions.ORGANIZATION_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  const org = context.organization;

  return (
    <div className="staff-page">
      <SettingsBackLink />
      <StaffPageHeader
        eyebrow="Settings"
        title="Organization profile"
        description="Public-facing identity and contact details for your hospital or clinic. Private fields are never exposed on the website."
      />
      <div className="staff-form-page">
        <SettingsForm
          action={updateOrganizationProfileAction}
          cancelHref="/staff/settings"
          sections={[
            {
              eyebrow: "Identity",
              title: "Hospital identity",
              fields: [
                { name: "name", label: "Hospital / clinic name", defaultValue: org.name, required: true },
                { name: "legal_name", label: "Legal name", defaultValue: org.legal_name, hint: "Registered legal entity name, if different." },
                { name: "description", label: "Description", type: "textarea", wide: true, defaultValue: org.description, hint: "Shown on the public website." },
              ],
            },
            {
              eyebrow: "Contact",
              title: "Contact details",
              fields: [
                { name: "email", label: "Primary email", type: "email", defaultValue: org.email },
                { name: "phone", label: "Telephone", defaultValue: org.phone },
                { name: "emergency_phone", label: "Emergency contact number", defaultValue: org.emergency_phone, hint: "Displayed to patients for urgent care guidance." },
                { name: "website", label: "Website", type: "url", defaultValue: org.website },
              ],
            },
            {
              eyebrow: "Location",
              title: "Address & region",
              fields: [
                { name: "address_line", label: "Address line", defaultValue: org.address_line },
                { name: "city", label: "City", defaultValue: org.city },
                { name: "district", label: "District", defaultValue: org.district },
                { name: "country_code", label: "Country code", defaultValue: org.country_code, required: true, hint: "ISO code, e.g. UG" },
              ],
            },
          ]}
        />
      </div>
    </div>
  );
}
