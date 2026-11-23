import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { StaffPageHeader, StaffSection } from "@/features/staff/components/staff-content";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { LogoUploadForm } from "@/features/settings/components/logo-upload-form";
import { AuthorizationError } from "@/server/errors";
import { getSettingsContext } from "@/server/services/settings.service";
import { updateBrandingSettingsAction } from "@/server/actions/settings.actions";
import { createClient } from "@/lib/supabase/server";
import { SettingsBackLink } from "@/features/settings/components/settings-back-link";

export const metadata = { title: "Branding · Settings" };

export default async function BrandingSettingsPage() {
  let context;
  try {
    context = await getSettingsContext();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  const s = context.effective;

  let logoUrl: string | null = null;
  if (context.organization.logo_path) {
    const supabase = await createClient();
    logoUrl = supabase.storage.from("organization-logos").getPublicUrl(context.organization.logo_path).data.publicUrl;
  }

  return (
    <div className="staff-page">
      <SettingsBackLink />
      <StaffPageHeader
        eyebrow="Settings"
        title="Branding"
        description="Logo and accent colour for the public website and staff workspace. Colours are validated to keep interfaces readable."
      />
      <div className="staff-form-page">
        <StaffSection title="Organization logo" eyebrow="Logo" description="Shown in the public website header and footer.">
          <LogoUploadForm currentUrl={logoUrl} orgName={context.organization.name} />
        </StaffSection>
        <SettingsForm
          action={updateBrandingSettingsAction}
          cancelHref="/staff/settings"
          sections={[
            {
              eyebrow: "Appearance",
              title: "Accent colour",
              description: "Used for active navigation and accent highlights in the staff portal. Must be a six-digit hex colour.",
              fields: [
                { name: "brand_color", label: "Brand colour", type: "text", defaultValue: s.brand_color, required: true, placeholder: "#0d9488", hint: "e.g. #0d9488 (teal) or #1d4ed8 (blue)" },
              ],
            },
          ]}
        />
      </div>
    </div>
  );
}
