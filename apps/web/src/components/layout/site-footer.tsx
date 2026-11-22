import { Cross, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

import { site } from "@/config/site";
import { clinicDescription, clinicName, contactLabel } from "@/lib/public-content";

const footerGroups = [
  { title: "Care", links: [{ label: "Departments", href: "/departments" }, { label: "Services", href: "/services" }, { label: "Facilities", href: "/facilities" }, { label: "Appointments", href: "/appointments" }] },
  { title: "Patients", links: [{ label: "Patient portal", href: "/portal" }, { label: "Sign in", href: "/login" }, { label: "Register", href: "/register" }, { label: "FAQs", href: "/#faq" }] },
  { title: "Information", links: [{ label: "About", href: "/about" }, { label: "Contact", href: "/contact" }, { label: "Staff Portal", href: "/staff/login" }] },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-container footer-grid">
        <div className="footer-brand">
          <Link className="brand brand--footer" href="/">
            <span className="brand__mark"><Cross aria-hidden="true" /></span>
            <strong>{clinicName()}</strong>
          </Link>
          <p>{clinicDescription()}</p>
          <ul className="footer-contact" aria-label="Clinic contact details">
            <li><MapPin aria-hidden="true" /><span>{contactLabel(site.address, "Location information is being prepared")}</span></li>
            <li><Phone aria-hidden="true" /><span>{contactLabel(site.phone, "Phone details are being prepared")}</span></li>
            <li><Mail aria-hidden="true" /><span>{contactLabel(site.email, "Email details are being prepared")}</span></li>
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
        <p>© {new Date().getFullYear()} {clinicName()}. All rights reserved.</p>
        <p>Appointment submissions are requests and require clinic review.</p>
      </div>
    </footer>
  );
}
