"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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

const POSITION_KEY = "hospica.quick-links-dock-pos";
const DRAG_THRESHOLD = 4;
const PANEL_FLIP_X = 300;

type DockPosition = { x: number; y: number };
type DragState = { pointerId: number; startX: number; startY: number; originX: number; originY: number; moved: boolean };

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

let cachedRaw: string | null = null;
let cachedPosition: DockPosition | null = null;

function parsePosition(raw: string | null): DockPosition | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<DockPosition>;
    return typeof parsed.x === "number" && typeof parsed.y === "number" ? { x: parsed.x, y: parsed.y } : null;
  } catch {
    return null;
  }
}

function getSavedPosition(): DockPosition | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(POSITION_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedPosition = parsePosition(raw);
  }
  return cachedPosition;
}

function subscribeToStorage() {
  return () => {};
}

export function FloatingQuickLinks() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dragPosition, setDragPosition] = useState<DockPosition | null>(null);
  const [dragging, setDragging] = useState(false);
  const savedPosition = useSyncExternalStore(subscribeToStorage, getSavedPosition, () => null);
  const position = dragPosition ?? savedPosition;
  const toggleRef = useRef<HTMLButtonElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);

  function clampPosition(x: number, y: number): DockPosition {
    const el = dockRef.current;
    const width = el?.offsetWidth ?? 160;
    const height = el?.offsetHeight ?? 44;
    return {
      x: Math.min(Math.max(0, x), Math.max(0, window.innerWidth - width)),
      y: Math.min(Math.max(0, y), Math.max(0, window.innerHeight - height)),
    };
  }

  function persistPosition(pos: DockPosition) {
    cachedRaw = JSON.stringify(pos);
    cachedPosition = pos;
    try {
      window.localStorage.setItem(POSITION_KEY, cachedRaw);
    } catch {
      // Storage unavailable (private mode) — position just won't persist.
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    const rect = dockRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!drag.moved) {
      drag.moved = true;
      setDragging(true);
      setOpen(false);
    }
    setDragPosition(clampPosition(drag.originX + dx, drag.originY + dy));
  }

  function endDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (!drag.moved) return;
    suppressClickRef.current = true;
    const finalPos = clampPosition(drag.originX + (event.clientX - drag.startX), drag.originY + (event.clientY - drag.startY));
    setDragPosition(finalPos);
    persistPosition(finalPos);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setOpen((value) => !value);
  }

  // Close on tap/click outside the dock.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (dockRef.current && !dockRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

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

  const panelFlip = position !== null && position.x < PANEL_FLIP_X;
  const viewportHeight = typeof window === "undefined" ? 768 : window.innerHeight;
  const panelBelow = position !== null && position.y < 210;
  const panelAbove = position !== null && position.y > viewportHeight - 280;

  return (
    <div
      className={`quick-links-dock${open ? " is-open" : ""}${dragging ? " is-dragging" : ""}${position ? " is-positioned" : ""}${panelFlip ? " quick-links-dock--panel-right" : ""}${panelBelow ? " quick-links-dock--panel-below" : ""}${panelAbove ? " quick-links-dock--panel-above" : ""}`}
      ref={dockRef}
      style={position ? { left: position.x, top: position.y, right: "auto", bottom: "auto", transform: "none" } : undefined}
    >
      <button
        aria-controls="quick-links-panel"
        aria-expanded={open}
        className="quick-links-dock__toggle"
        onClick={handleClick}
        onPointerCancel={endDrag}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        ref={toggleRef}
        title="Drag to move"
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
