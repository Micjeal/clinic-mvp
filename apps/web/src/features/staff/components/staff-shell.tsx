"use client";

import { 
  BriefcaseMedical,
  Building,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Globe2,
  Hospital,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Stethoscope,
  FlaskConical,
  Package,
  Pill,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { staffSignOutAction } from "@/server/actions/staff-auth.actions";

type Context = { name: string; role: string; organization: string; permissions?: string[]; brandColor?: string; dateFormat?: string; timeFormat?: string; locale?: string; timezone?: string };

function formatTopbarDate(date: Date, dateFormat: string, timeFormat: string, locale: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: timeFormat === "12h",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const dayText = new Intl.DateTimeFormat(locale, { month: "short", timeZone }).format(date);
  const dateText = dateFormat === "yyyy-mm-dd" ? `${get("year")}-${get("month")}-${get("day")}`
    : dateFormat === "dd/mm/yyyy" ? `${get("day")}/${get("month")}/${get("year")}`
    : dateFormat === "mm/dd/yyyy" ? `${get("month")}/${get("day")}/${get("year")}`
    : `${Number(get("day"))} ${dayText} ${get("year")}`;
  const meridiem = timeFormat === "12h" ? ` ${get("dayPeriod")}` : "";
  return `${dateText} · ${get("hour")}:${get("minute")}${meridiem}`;
}

const navigation = [
  { href: "/staff", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { href: "/staff/reception", label: "Reception", icon: ClipboardCheck, permission: "reception.checkin", group: "Daily operations" },
  { href: "/staff/queue", label: "Queue", icon: ClipboardList, permission: "queue.read", group: "Daily operations" },
  { href: "/staff/triage", label: "Triage", icon: Stethoscope, permission: "triage.write", group: "Daily operations" },
  { href: "/staff/billing", label: "Billing", icon: Wallet, permission: "billing.read", group: "Finance" },
  { href: "/staff/lab", label: "Laboratory", icon: FlaskConical, permission: "lab.read", group: "Clinical" },
  { href: "/staff/pharmacy", label: "Pharmacy", icon: Pill, permission: "prescription.read", group: "Clinical" },
  { href: "/staff/inventory", label: "Inventory", icon: Package, permission: "inventory.read", group: "Operations" },
  { href: "/staff/appointments", label: "Appointments", icon: CalendarDays, permission: "appointment.read", group: "Daily operations" },
  { href: "/staff/users", label: "Staff", icon: Building2, permission: "staff.manage", group: "Administration" },
  { href: "/staff/facilities", label: "Facilities", icon: Hospital, permission: "facility.manage", group: "Administration" },
  { href: "/staff/departments", label: "Departments", icon: Building, permission: "department.manage", group: "Administration" },
  { href: "/staff/services", label: "Services", icon: BriefcaseMedical, permission: "service.manage", group: "Administration" },
  { href: "/staff/settings", label: "Settings", icon: Settings, permission: "settings.manage", group: "Administration" },
];

function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Navigation({ close, permissions = [] }: { close?: () => void; permissions?: string[] }) {
  const pathname = usePathname();
  const items = navigation.filter((item) => !item.permission || permissions.includes(item.permission));
  return (
    <nav aria-label="Staff navigation" className="staff-nav">
      {items.map((item, index) => {
        const Icon = item.icon;
        const active = item.href === "/staff" ? pathname === item.href : pathname.startsWith(item.href);
        const showGroup = index === 0 || items[index - 1].group !== item.group;
        return (
          <div className="staff-nav__group" key={item.href}>
            {showGroup ? <p className="staff-nav-label staff-nav-label--group">{item.group}</p> : null}
            <Link
              aria-current={active ? "page" : undefined}
              className={active ? "is-active" : ""}
              href={item.href}
              onClick={close}
              title={item.label}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}

function SignOut() {
  return (
    <form action={staffSignOutAction}>
      <button className="staff-signout" type="submit">
        <LogOut aria-hidden="true" />
        <span>Sign out</span>
      </button>
    </form>
  );
}

function AccountSection({ context }: { context: Context }) {
  const initials = initialsFromName(context.name);
  return (
    <section aria-label="Signed-in account" className="staff-sidebar-account">
      <p className="staff-nav-label staff-nav-label--account">Account</p>
      <div className="staff-sidebar-profile" title={`${context.name} (${context.role})`}>
        <span aria-hidden="true" className="staff-sidebar-avatar">
          {initials}
        </span>
        <span className="staff-sidebar-profile__text">
          <strong>{context.name}</strong>
          <small>{context.role}</small>
        </span>
      </div>
    </section>
  );
}

export function StaffShell({ children, context }: { children: React.ReactNode; context: Context }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  const closeDrawer = () => {
    setOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
    setAccountOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDrawer();
        return;
      }
      if (event.key !== "Tab") return;
      const drawer = drawerRef.current;
      if (!drawer) return;
      const items = Array.from(
        drawer.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      ).filter((el) => el.getClientRects().length > 0);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const inside = active ? drawer.contains(active) : false;
      if (event.shiftKey) {
        if (!inside || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!inside || active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!accountOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) setAccountOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountOpen(false);
        accountTriggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen]);

  const initials = initialsFromName(context.name);
  const pageName = pathname.startsWith("/staff/appointments")
    ? "Appointments"
    : pathname.startsWith("/staff/reception")
      ? "Reception"
      : pathname.startsWith("/staff/queue")
        ? "Queue"
        : pathname.startsWith("/staff/triage")
          ? "Triage"
          : pathname.startsWith("/staff/users")
            ? "Staff"
            : pathname.startsWith("/staff/facilities")
              ? "Facilities"
              : pathname.startsWith("/staff/departments")
                ? "Departments"
                : pathname.startsWith("/staff/services")
                  ? "Services"
                  : "Dashboard";

  return (
    <div
      className={`staff-surface staff-shell${collapsed ? " is-collapsed" : ""}`}
      style={context.brandColor ? ({ "--brand-accent": context.brandColor } as React.CSSProperties) : undefined}
    >
      <aside className="staff-sidebar">
        <div className="staff-brand-row">
          <Link aria-label={`${context.organization} staff dashboard`} className="staff-brand" href="/staff">
            <span>
              <Building2 aria-hidden="true" />
            </span>
            <span>
              <strong>{context.organization}</strong>
              <small>Staff portal</small>
            </span>
          </Link>
          <button
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="staff-collapse-button"
            onClick={() => setCollapsed((value) => !value)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
          >
            {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
          </button>
        </div>
        <div className="staff-sidebar-scroll">
          <Navigation permissions={context.permissions} />
        </div>
        <div className="staff-sidebar-bottom">
          <AccountSection context={context} />
          <p className="staff-nav-label staff-nav-divider">Hospital website</p>
          <div className="staff-sidebar__footer">
            <Link href="/">
              <Globe2 aria-hidden="true" />
              <span>Return to website</span>
            </Link>
            <SignOut />
          </div>
        </div>
      </aside>
      <div className="staff-workspace">
        <header className="staff-topbar" style={{ backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
          <button
            aria-controls="staff-mobile-drawer"
            aria-expanded={open}
            aria-label="Open staff navigation"
            className="staff-menu-button"
            onClick={() => setOpen(true)}
            ref={menuButtonRef}
            type="button"
          >
            <Menu aria-hidden="true" />
          </button>
          <div className="staff-topbar__page">
            <span>Staff portal</span>
            <strong>{pageName}</strong>
          </div>
          <div className="staff-topbar__context" ref={accountRef}>
            <span className="staff-date" suppressHydrationWarning><CalendarDays aria-hidden="true" />{formatTopbarDate(new Date(), context.dateFormat ?? "d mmm yyyy", context.timeFormat ?? "24h", context.locale ?? "en-UG", context.timezone ?? "Africa/Kampala")}</span>
            <button
              aria-expanded={accountOpen}
              className="staff-account-trigger"
              onClick={() => setAccountOpen((value) => !value)}
              ref={accountTriggerRef}
              type="button"
            >
              <span aria-hidden="true" className="staff-account-avatar">
                {initials}
              </span>
              <span>
                <strong>{context.name}</strong>
                <small>{context.role}</small>
              </span>
            </button>
            {accountOpen ? (
              <div className="staff-account-menu">
                <strong>{context.name}</strong>
                <span>{context.role}</span>
                <span>{context.organization}</span>
                <Link href="/staff">Dashboard</Link>
                <Link href="/">Hospital website</Link>
                <SignOut />
              </div>
            ) : null}
          </div>
        </header>
        <div className="staff-content">{children}</div>
      </div>
      <div className={`staff-drawer-layer${open ? " is-open" : ""}`}>
        <button
          aria-label="Close staff navigation"
          className="staff-drawer-backdrop"
          onClick={closeDrawer}
          tabIndex={open ? 0 : -1}
          type="button"
        />
        <aside
          aria-hidden={!open}
          aria-label="Mobile staff navigation"
          aria-modal={open ? true : undefined}
          className="staff-drawer"
          id="staff-mobile-drawer"
          inert={!open}
          ref={drawerRef}
          role="dialog"
        >
          <div className="staff-drawer__heading">
            <strong>Staff portal</strong>
            <button aria-label="Close staff navigation" onClick={closeDrawer} ref={closeButtonRef} type="button">
              <X aria-hidden="true" />
            </button>
          </div>
          <div className="staff-sidebar-scroll">
            <Navigation close={closeDrawer} permissions={context.permissions} />
          </div>
          <div className="staff-sidebar-bottom">
            <AccountSection context={context} />
            <p className="staff-nav-label staff-nav-divider">Hospital website</p>
            <div className="staff-sidebar__footer">
              <Link href="/" onClick={closeDrawer}>
                <Globe2 aria-hidden="true" />
                <span>Return to website</span>
              </Link>
              <SignOut />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
