import { CalendarPlus, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

import { PageHero } from "@/components/layout/page-hero";
import { site } from "@/config/site";
import { contactLabel, isPlaceholderValue, safeFacilityLocation, safeFacilityName } from "@/lib/public-content";
import { getPublicFacilities } from "@/server/services/facility.service";
import { getPublicOrganizationProfile } from "@/server/services/settings.service";

export const metadata = { title: "Contact" };

export default async function ContactPage() {
  const [facilities, organization] = await Promise.all([getPublicFacilities(), getPublicOrganizationProfile()]);
  const orgAddress = organization
    ? [organization.address_line, organization.city, organization.district, organization.country_code].filter(Boolean).join(", ")
    : "";
  const phone = organization?.phone || site.phone;
  const email = organization?.email || site.email;
  const address = orgAddress || site.address;
  const contactCards = [
    { title: "Call", value: contactLabel(phone, "Phone details are being prepared."), icon: Phone, href: isPlaceholderValue(phone) ? undefined : `tel:${phone.replace(/\s/g, "")}` },
    { title: "Email", value: contactLabel(email, "Email details are being prepared."), icon: Mail, href: isPlaceholderValue(email) ? undefined : `mailto:${email}` },
    { title: "Location", value: contactLabel(address, "Location information is being prepared."), icon: MapPin },
  ];
  return (
    <>
      <PageHero eyebrow="Contact" title="We’ll help you find the right next step." description="Use the configured clinic details below, review facility information or submit an appointment request online." />
      <section className="section">
        <div className="site-container contact-grid">
          {contactCards.map((card) => { const Icon = card.icon; const content = <><span className="icon-box"><Icon aria-hidden="true" /></span><div><h2>{card.title}</h2><p>{card.value}</p></div></>; return card.href ? <a className="contact-card" href={card.href} key={card.title}>{content}</a> : <article className="contact-card" key={card.title}>{content}</article>; })}
        </div>
      </section>
      <section className="section section--soft">
        <div className="site-container">
          <div className="section-heading"><p className="eyebrow">Facilities</p><h2>Public care locations.</h2><p>Only configured public facility information is shown.</p></div>
          {facilities.length ? <div className="facility-list">{facilities.map((facility) => <article className="facility-card" key={facility.id}><div><span className="facility-type">{facility.facility_type}</span><h3>{safeFacilityName(facility.name)}</h3><p className="facility-location"><MapPin aria-hidden="true" />{safeFacilityLocation(facility)}</p></div><Link className="card-link" href={`/appointments?facility=${facility.id}`}>Request an appointment <span aria-hidden="true">→</span></Link></article>)}</div> : <div className="empty-state">Public facility information is currently being configured.</div>}
        </div>
      </section>
      <section className="section compact-cta"><div className="site-container compact-cta__inner"><div><p className="eyebrow">Plan your visit</p><h2>Ready to request an appointment?</h2><p>Select a preferred date and time for clinic review.</p></div><Link className="btn" href="/appointments"><CalendarPlus aria-hidden="true" />Book appointment</Link></div></section>
    </>
  );
}
