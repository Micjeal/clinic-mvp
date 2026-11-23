import type { Metadata } from "next";

import { clinicDescription, clinicName } from "@/lib/public-content";
import { getPublicOrganizationProfile } from "@/server/services/settings.service";
import "@/styles/globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const organization = await getPublicOrganizationProfile();
  const name = organization?.name || clinicName();
  return {
    title: {
      default: name,
      template: `%s | ${name}`,
    },
    description: organization?.description || clinicDescription(),
  };
}

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
