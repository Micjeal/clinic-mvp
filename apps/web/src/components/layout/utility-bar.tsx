import { CircleHelp, HeartPulse, MapPin, Phone, UserRound } from "lucide-react";
import Link from "next/link";

import { site } from "@/config/site";
import { contactLabel } from "@/lib/public-content";

export function UtilityBar() {
  const phone = contactLabel(site.phone, "Contact details are being prepared");
  const hasPhone = phone === site.phone;

  return (
    <div className="utility-bar">
      <div className="site-container utility-bar__inner" aria-label="Patient help links">
        <div className="utility-bar__urgent">
          <HeartPulse aria-hidden="true" />
          <span>Need urgent care?</span>
          <span className="utility-bar__notice">Contact your local emergency service</span>
        </div>
        <nav className="utility-bar__links" aria-label="Utility navigation">
          {hasPhone ? (
            <a href={`tel:${site.phone.replace(/\s/g, "")}`}>
              <Phone aria-hidden="true" />
              <span>{phone}</span>
            </a>
          ) : (
            <Link href="/contact">
              <CircleHelp aria-hidden="true" />
              <span>Contact</span>
            </Link>
          )}
          <Link href="/facilities"><MapPin aria-hidden="true" /><span>Find a facility</span></Link>
          <Link href="/portal"><UserRound aria-hidden="true" /><span>Patient portal</span></Link>
        </nav>
      </div>
    </div>
  );
}
