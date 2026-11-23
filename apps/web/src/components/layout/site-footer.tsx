import { Globe, Cross, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

import { site } from "@/config/site";
import { clinicDescription, clinicName, contactLabel } from "@/lib/public-content";
import { getPublicOrganizationProfile } from "@/server/services/settings.service";

const footerGroups = [
  { title: "Care", links: [{ label: "Departments", href: "/departments" }, { label: "Services", href: "/services" }, { label: "Facilities", href: "/facilities" }, { label: "Appointments", href: "/appointments" }] },
  { title: "Patients", links: [{ label: "Patient portal", href: "/portal" }, { label: "Sign in", href: "/login" }, { label: "Register", href: "/register" }, { label: "FAQs", href: "/#faq" }] },
  { title: "Information", links: [{ label: "About", href: "/about" }, { label: "Contact", href: "/contact" }, { label: "Staff Portal", href: "/staff/login" }] },
] as const;

export async function SiteFooter() {
  const organization = await getPublicOrganizationProfile();
  const orgAddress = organization ? [organization.address_line, organization.city, organization.district, organization.country_code].filter(Boolean).join(", ") : "";
  const phone = organization?.phone || site.phone;
  const email = organization?.email || site.email;
  const address = orgAddress || site.address;
  return (
    <footer className="site-footer">
      <div className="site-container footer-grid">
        <div className="footer-brand">
          <Link className="brand brand--footer" href="/">
            <span className="brand__mark"><Cross aria-hidden="true" /></span>
            <strong>{organization?.name || clinicName()}</strong>
          </Link>
          <p>{organization?.description || clinicDescription()}</p>
          <ul className="footer-contact" aria-label="Clinic contact details">
            <li><MapPin aria-hidden="true" /><span>{contactLabel(address, "Location information is being prepared")}</span></li>
            <li><Phone aria-hidden="true" /><span>{contactLabel(phone, "Phone details are being prepared")}</span></li>
            <li><Mail aria-hidden="true" /><span>{contactLabel(email, "Email details are being prepared")}</span></li>
            {organization?.website ? <li><Globe aria-hidden="true" /><a href={organization.website} rel="noreferrer" target="_blank">{organization.website.replace(/^https?:\/\//, "")}</a></li> : null}
          </ul>
        </div>
        {footerGroups.map((group) => (
          <div className="footer-column" key={group.title}>
            <h2>{group.title}</h2>
            <ul>{group.links.map((link) => <li key={link.label}><Link href={link.href}>{link.label}</Link></li>)}</ul>
          </div>
        ))}
      </div>
      <div className="site-container footer-bottom">
        <p>© {new Date().getFullYear()} {organization?.name || clinicName()}. All rights reserved.</p>
        <p>Appointment submissions are requests and require clinic review.</p>
      </div>
    </footer>
  );
}
