"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Suggestion = { label: string; hint: string; href: string };

const STATIC_PAGES: Suggestion[] = [
  { label: "Book an appointment", hint: "Page", href: "/appointments" },
  { label: "Our doctors", hint: "Page", href: "/doctors" },
  { label: "Departments", hint: "Page", href: "/departments" },
  { label: "Services", hint: "Page", href: "/services" },
  { label: "Facilities", hint: "Page", href: "/facilities" },
  { label: "Patient portal", hint: "Page", href: "/portal" },
  { label: "Contact & emergency", hint: "Page", href: "/contact" },
];

export function HeroSearch({ departments, services, facilities, doctors }: {
  departments: { id: string; name: string }[];
  services: { id: string; name: string }[];
  facilities: { id: string; name: string }[];
  doctors: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo<Suggestion[]>(() => {
    const q = query.trim().toLowerCase();
    const all: Suggestion[] = [
      ...STATIC_PAGES,
      ...departments.map((d) => ({ label: d.name, hint: "Department", href: `/departments/${d.id}` })),
      ...services.map((s) => ({ label: s.name, hint: "Service", href: "/services" })),
      ...facilities.map((f) => ({ label: f.name, hint: "Facility", href: "/facilities" })),
      ...doctors.map((d) => ({ label: d.name, hint: "Doctor", href: `/doctors/${d.slug}` })),
    ];
    if (!q) return all.slice(0, 6);
    return all.filter((s) => s.label.toLowerCase().includes(q)).slice(0, 8);
  }, [query, departments, services, facilities, doctors]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  const go = (href: string) => { setOpen(false); setQuery(""); router.push(href); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(suggestions.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (suggestions[active]) go(suggestions[active].href); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  return (
    <div className="hero-search" ref={boxRef}>
      <form className="hero-search__pill" onSubmit={(e) => { e.preventDefault(); if (suggestions[0]) go(suggestions[0].href); }} role="search">
        <Search aria-hidden="true" className="hero-search__icon" />
        <input
          aria-expanded={open}
          aria-label="Search the website"
          autoComplete="off"
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search the website…"
          type="search"
          value={query}
        />
        {query ? <button aria-label="Clear search" className="hero-search__clear" onClick={() => { setQuery(""); setOpen(true); }} type="button"><X size={14} /></button> : null}
        <button className="hero-search__submit" type="submit">Search</button>
      </form>
      {open && suggestions.length ? (
        <ul className="hero-search__results">
          {suggestions.map((s, i) => (
            <li key={`${s.href}-${s.label}`}>
              <button className={i === active ? "is-active" : ""} onClick={() => go(s.href)} onMouseEnter={() => setActive(i)} type="button">
                <span className="hero-search__result-label">{s.label}</span>
                <span className="hero-search__result-hint">{s.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
