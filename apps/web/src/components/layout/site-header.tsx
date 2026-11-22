import { Cross, UserRound } from "lucide-react";
import Link from "next/link";

import { clinicName } from "@/lib/public-content";

import { DesktopNavigation } from "./desktop-navigation";
import { MobileNavigation } from "./mobile-navigation";
import { UtilityBar } from "./utility-bar";

export function SiteHeader() {
  return (
    <header className="site-header">
      <UtilityBar />
      <div className="main-header">
        <div className="site-container main-header__inner">
          <Link className="brand" href="/" aria-label={`${clinicName()} home`}>
            <span className="brand__mark"><Cross aria-hidden="true" /></span>
            <span><strong>{clinicName()}</strong><small>Care that keeps you informed</small></span>
          </Link>
          <DesktopNavigation />
          <div className="main-header__actions">
            <Link className="portal-shortcut" href="/portal" aria-label="Patient portal"><UserRound aria-hidden="true" /></Link>
            <Link className="btn btn--compact" href="/appointments">Book appointment</Link>
            <MobileNavigation />
          </div>
        </div>
      </div>
    </header>
  );
}
