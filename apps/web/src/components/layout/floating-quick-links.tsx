"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarPlus,
  ChevronLeft,
  ClipboardList,
  HeartPulse,
  Phone,
  Stethoscope,
  UserRound,
} from "lucide-react";

const quickLinks = [
  { label: "Book appointment", description: "Request a visit", href: "/appointments", icon: CalendarPlus },
  { label: "Our doctors", description: "Browse clinicians", href: "/doctors", icon: Stethoscope },
  { label: "Departments", description: "Explore care areas", href: "/departments", icon: HeartPulse },
  { label: "Services", description: "See what we offer", href: "/services", icon: ClipboardList },
  { label: "Facilities", description: "Find a location", href: "/facilities", icon: Building2 },
  { label: "Patient portal", description: "Track your requests", href: "/portal", icon: UserRound },
  { label: "Contact", description: "Urgent care & enquiries", href: "/contact", icon: Phone },
] as const;

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function FloatingQuickLinks() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close on Escape and return focus to the toggle.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className={open ? "quick-links-dock is-open" : "quick-links-dock"}>
      <button
        aria-controls="quick-links-panel"
        aria-expanded={open}
        className="quick-links-dock__toggle"
        onClick={() => setOpen((value) => !value)}
        ref={toggleRef}
        type="button"
      >
        <ChevronLeft aria-hidden="true" />
        Quick links
      </button>
      {open && (
        <nav aria-label="Quick links" className="quick-links-dock__panel" id="quick-links-panel">
          <p className="quick-links-dock__heading">Quick links</p>
          <ul className="quick-links-dock__list">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              const active = isRouteActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={active ? "is-active" : ""}
                    href={link.href}
                    onClick={() => setOpen(false)}
                  >
                    <span className="icon-box" aria-hidden="true"><Icon /></span>
                    <span className="quick-links-dock__label">
                      <strong>{link.label}</strong>
                      <small>{link.description}</small>
                    </span>
                    <span className="quick-links-dock__arrow" aria-hidden="true">→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
