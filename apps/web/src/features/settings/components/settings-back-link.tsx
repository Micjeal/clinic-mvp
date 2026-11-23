import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function SettingsBackLink() {
  return (
    <Link className="staff-settings-back" href="/staff/settings">
      <ArrowLeft aria-hidden="true" />
      Back to settings
    </Link>
  );
}
