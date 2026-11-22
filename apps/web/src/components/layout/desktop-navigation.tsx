"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const groups = [
  { label: "About", links: [
    { label: "About us", href: "/about", description: "Our approach to patient care" },
    { label: "Our facilities", href: "/facilities", description: "Find a care location" },
  ] },
  { label: "Care & services", links: [
    { label: "Departments", href: "/departments", description: "Explore clinical departments" },
    { label: "Services", href: "/services", description: "Browse available services" },
  ] },
  { label: "Patients & visitors", links: [
    { label: "Book an appointment", href: "/appointments", description: "Submit an appointment request" },
    { label: "Patient portal", href: "/portal", description: "Track and manage requests" },
    { label: "Frequently asked questions", href: "/#faq", description: "Understand how requests work" },
  ] },
] as const;

function isRouteActive(pathname: string, href: string) {
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopNavigation() {
  const pathname = usePathname();
  return (
    <nav className="desktop-nav" aria-label="Primary navigation">
      <Link className={isRouteActive(pathname, "/") ? "nav-link is-active" : "nav-link"} href="/">Home</Link>
      <Link className={isRouteActive(pathname, "/doctors") ? "nav-link is-active" : "nav-link"} href="/doctors">Our doctors</Link>
      {groups.map((group) => {
        const active = group.links.some((link) => isRouteActive(pathname, link.href));
        return (
          <details className="nav-dropdown" key={group.label}>
            <summary className={active ? "nav-link is-active" : "nav-link"}>
              {group.label}<ChevronDown aria-hidden="true" />
            </summary>
            <div className="nav-dropdown__panel">
              {group.links.map((link) => (
                <Link className={isRouteActive(pathname, link.href) ? "is-active" : ""} href={link.href} key={link.label}>
                  <strong>{link.label}</strong><span>{link.description}</span>
                </Link>
              ))}
            </div>
          </details>
        );
      })}
      <Link className={isRouteActive(pathname, "/contact") ? "nav-link is-active" : "nav-link"} href="/contact">Contact</Link>
    </nav>
  );
}
