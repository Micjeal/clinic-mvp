import { Cross, UserRound } from "lucide-react";
import Link from "next/link";

import { clinicName } from "@/lib/public-content";
import { getPublicOrganizationProfile } from "@/server/services/settings.service";

import { DesktopNavigation } from "./desktop-navigation";
import { MobileNavigation } from "./mobile-navigation";
import { UtilityBar } from "./utility-bar";

export async function SiteHeader() {
  const organization = await getPublicOrganizationProfile();
  return (
    <header className="site-header">
      <UtilityBar />
      <div className="main-header">
        <div className="site-container main-header__inner">
          <Link className="brand" href="/" aria-label={`${organization?.name || clinicName()} home`}>
            <span className="brand__mark">{organization?.logo_url ? <img alt="" className="brand__logo" src={organization.logo_url} /> : <Cross aria-hidden="true" />}</span>
            <span><strong>{organization?.name || clinicName()}</strong><small>Care that keeps you informed</small></span>
          </Link>
          <DesktopNavigation />
          <div className="main-header__actions">
            <Link className="portal-shortcut" href="/portal" aria-label="Patient portal"><UserRound aria-hidden="true" /></Link>
            <Link className="btn header-book-btn" href="/appointments">Book appointment</Link>
            <MobileNavigation />
          </div>
        </div>
      </div>
    </header>
  );
}
