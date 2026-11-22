import type { Metadata } from "next";

import { clinicDescription, clinicName } from "@/lib/public-content";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: clinicName(),
    template: `%s | ${clinicName()}`,
  },
  description: clinicDescription(),
};

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
