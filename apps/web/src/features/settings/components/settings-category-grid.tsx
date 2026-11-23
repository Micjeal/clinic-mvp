"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type SettingsCategory = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  keywords?: string;
};

export function SettingsCategoryGrid({ categories }: { categories: SettingsCategory[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((category) =>
      `${category.title} ${category.description} ${category.keywords ?? ""}`.toLowerCase().includes(q),
    );
  }, [categories, query]);

  return (
    <div className="staff-settings-browser">
      <label className="staff-directory-search staff-settings-search">
        <span className="sr-only">Search settings</span>
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search settings — try “booking”, “logo”, “audit”…"
          type="search"
          value={query}
        />
      </label>
      {filtered.length ? (
        <div className="staff-settings-grid">
          {filtered.map((category) => {
            const Icon = category.icon;
            return (
              <Link className="staff-settings-card" href={category.href} key={category.href}>
                <span className="staff-settings-card__icon"><Icon aria-hidden="true" /></span>
                <span className="staff-settings-card__body">
                  <strong>{category.title}</strong>
                  <small>{category.description}</small>
                </span>
                <span aria-hidden="true" className="staff-settings-card__arrow">→</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="staff-empty staff-directory-empty">
          <h2>No matching settings</h2>
          <p>Try a different search term, or browse the categories below.</p>
        </div>
      )}
    </div>
  );
}
