"use client";

import {
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Globe2,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Stethoscope,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { staffSignOutAction } from "@/server/actions/staff-auth.actions";

type Context = { name: string; role: string; organization: string; permissions?: string[] };

const navigation = [
  { href: "/staff", label: "Dashboard", icon: LayoutDashboard },
  { href: "/staff/reception", label: "Reception", icon: ClipboardCheck, permission: "reception.checkin" },
  { href: "/staff/queue", label: "Queue", icon: ClipboardList, permission: "queue.read" },
  { href: "/staff/triage", label: "Triage", icon: Stethoscope, permission: "triage.write" },
  { href: "/staff/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/staff/users", label: "Staff", icon: Building2, permission: "staff.manage" },
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
  return (
    <nav aria-label="Staff navigation" className="staff-nav">
      {navigation
        .filter((item) => !item.permission || permissions.includes(item.permission))
        .map((item) => {
          const Icon = item.icon;
          const active = item.href === "/staff" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={active ? "is-active" : ""}
              href={item.href}
              key={item.href}
              onClick={close}
              title={item.label}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
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
  const pathname = usePathname();

  const closeDrawer = () => {
    setOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

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
            : "Dashboard";

  return (
    <div className={`staff-surface staff-shell${collapsed ? " is-collapsed" : ""}`}>
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
          <p className="staff-nav-label">Operations</p>
          <Navigation permissions={context.permissions} />
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
        </div>
      </aside>
      <div className="staff-workspace">
        <header className="staff-topbar">
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
          <div className="staff-topbar__context">
            <span className="staff-date">{new Intl.DateTimeFormat("en-UG", { dateStyle: "medium" }).format(new Date())}</span>
            <button
              aria-expanded={accountOpen}
              className="staff-account-trigger"
              onClick={() => setAccountOpen((value) => !value)}
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
          className="staff-drawer"
          id="staff-mobile-drawer"
          inert={!open}
        >
          <div className="staff-drawer__heading">
            <strong>Staff portal</strong>
            <button aria-label="Close staff navigation" onClick={closeDrawer} ref={closeButtonRef} type="button">
              <X aria-hidden="true" />
            </button>
          </div>
          <div className="staff-sidebar-scroll">
            <p className="staff-nav-label">Operations</p>
            <Navigation close={closeDrawer} permissions={context.permissions} />
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
          </div>
        </aside>
      </div>
    </div>
  );
}
