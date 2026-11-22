"use client";

import { ChevronDown, Menu, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const mobileGroups = [
  { label: "About", links: [{ label: "About us", href: "/about" }, { label: "Our facilities", href: "/facilities" }] },
  { label: "Care & services", links: [{ label: "Departments", href: "/departments" }, { label: "Services", href: "/services" }] },
  { label: "Patients & visitors", links: [{ label: "Book an appointment", href: "/appointments" }, { label: "Frequently asked questions", href: "/#faq" }, { label: "Contact", href: "/contact" }] },
] as const;

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
      if (event.key === "Tab" && panelRef.current) {
        const focusable = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), summary"),
        );
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function closeNavigation() {
    setOpen(false);
  }

  return (
    <div className="mobile-nav">
      <button aria-controls="mobile-navigation-panel" aria-expanded={open} aria-label="Open navigation" className="icon-button mobile-nav__trigger" onClick={() => setOpen(true)} ref={menuButtonRef} type="button">
        <Menu aria-hidden="true" />
      </button>
      {open ? (
        <div className="mobile-nav__overlay" role="presentation" onMouseDown={closeNavigation}>
          <nav aria-label="Mobile navigation" className="mobile-nav__panel" id="mobile-navigation-panel" onMouseDown={(event) => event.stopPropagation()} ref={panelRef}>
            <div className="mobile-nav__top">
              <span className="mobile-nav__title">Menu</span>
              <button aria-label="Close navigation" className="icon-button" onClick={closeNavigation} ref={closeButtonRef} type="button"><X aria-hidden="true" /></button>
            </div>
            <Link className="mobile-nav__home" href="/" onClick={closeNavigation}>Home</Link>
            <Link className="mobile-nav__home" href="/doctors" onClick={closeNavigation}>Our doctors</Link>
            {mobileGroups.map((group) => (
              <details className="mobile-nav__group" key={group.label} open>
                <summary>{group.label}<ChevronDown aria-hidden="true" /></summary>
                <div>{group.links.map((link) => <Link href={link.href} key={link.label} onClick={closeNavigation}>{link.label}</Link>)}</div>
              </details>
            ))}
            <div className="mobile-nav__actions">
              <Link className="btn" href="/appointments" onClick={closeNavigation}>Book appointment</Link>
              <Link className="btn btn--secondary" href="/portal" onClick={closeNavigation}><UserRound aria-hidden="true" />Patient portal</Link>
            </div>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
