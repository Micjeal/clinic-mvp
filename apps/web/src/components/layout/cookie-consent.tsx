"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

const STORAGE_KEY = "hospica.cookie-consent";

type Consent = {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  performance: boolean;
  advertisement: boolean;
  uncategorised: boolean;
  updatedAt: string;
};

const CATEGORIES = [
  {
    key: "necessary" as const,
    title: "Necessary",
    locked: true,
    description: "Necessary cookies are required to enable the basic features of this site, such as providing secure log-in or adjusting your consent preferences. These cookies do not store any personally identifiable data.",
  },
  {
    key: "functional" as const,
    title: "Functional",
    description: "Functional cookies help perform certain functionalities like sharing the content of the website on social media platforms, collecting feedback, and other third-party features.",
  },
  {
    key: "analytics" as const,
    title: "Analytics",
    description: "Analytical cookies are used to understand how visitors interact with the website. These cookies help provide information on metrics such as the number of visitors, bounce rate, traffic source, etc.",
  },
  {
    key: "performance" as const,
    title: "Performance",
    description: "Performance cookies are used to understand and analyse the key performance indexes of the website which helps in delivering a better user experience for the visitors.",
  },
  {
    key: "advertisement" as const,
    title: "Advertisement",
    description: "Advertisement cookies are used to provide visitors with customised advertisements based on the pages you visited previously and to analyse the effectiveness of the ad campaigns.",
  },
  {
    key: "uncategorised" as const,
    title: "Uncategorised",
    description: "Other uncategorised cookies are those that are being analysed and have not been classified into a category as yet.",
  },
];

function loadConsent(): Consent | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Consent>;
    if (typeof parsed.functional !== "boolean") return null;
    return { necessary: true, functional: !!parsed.functional, analytics: !!parsed.analytics, performance: !!parsed.performance, advertisement: !!parsed.advertisement, uncategorised: !!parsed.uncategorised, updatedAt: parsed.updatedAt ?? new Date().toISOString() };
  } catch {
    return null;
  }
}

function saveConsent(consent: Omit<Consent, "necessary" | "updatedAt">) {
  const record: Consent = { necessary: true, ...consent, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  window.dispatchEvent(new CustomEvent("cookieConsentUpdated", { detail: record }));
  return record;
}

export function CookieConsent() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [customise, setCustomise] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>("necessary");
  const [showMore, setShowMore] = useState(false);
  const [prefs, setPrefs] = useState<Omit<Consent, "necessary" | "updatedAt">>({ functional: false, analytics: false, performance: false, advertisement: false, uncategorised: false });
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    if (!loadConsent()) setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setVisible(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible]);

  if (!mounted) return null;

  const accept = (all: boolean) => {
    const next = all
      ? { functional: true, analytics: true, performance: true, advertisement: true, uncategorised: true }
      : { functional: false, analytics: false, performance: false, advertisement: false, uncategorised: false };
    saveConsent(next);
    setPrefs(next);
    setVisible(false);
    setCustomise(false);
  };

  const savePrefs = () => {
    saveConsent(prefs);
    setVisible(false);
    setCustomise(false);
  };

  const reopen = () => {
    const saved = loadConsent();
    if (saved) setPrefs({ functional: saved.functional, analytics: saved.analytics, performance: saved.performance, advertisement: saved.advertisement, uncategorised: saved.uncategorised });
    setCustomise(true);
    setVisible(true);
  };

  const toggleCategory = (key: string, value: boolean) => setPrefs((p) => ({ ...p, [key]: value }));

  return (
    <>
      <button aria-label="Manage cookie preferences" className="cookie-fab" onClick={reopen} title="Cookie Preferences" type="button">
        <svg aria-hidden="true" fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="20">
          <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" /><path d="M8.5 8.5v.01M12 12v.01M15.5 15.5v.01M15.5 8.5v.01M8.5 15.5v.01" />
        </svg>
      </button>

      {visible ? (
        <div className="cookie-backdrop" onClick={() => setVisible(false)} role="presentation">
          <div aria-label="Cookie preferences" aria-modal="true" className="cookie-modal" onClick={(e) => e.stopPropagation()} ref={dialogRef} role="dialog">
            <div className="cookie-modal__body">
              <h2 className="cookie-modal__title">Customise Consent Preferences</h2>
              <p className="cookie-modal__intro">We use cookies to help you navigate efficiently and perform certain functions. You will find detailed information about all cookies under each consent category below.</p>
              <p className={`cookie-modal__legal${showMore ? " is-expanded" : ""}`}>
                The cookies that are categorised as &quot;Necessary&quot; are stored on your browser as they are essential for enabling the basic functionalities of the site. We also use third-party cookies that help us analyse how you use this website, store your preferences, and provide the content and advertisements that are relevant to you. These cookies will only be stored in your browser with your prior consent. You can choose to enable or disable some or all of these cookies but disabling some of them may affect your browsing experience.
                <button className="cookie-modal__more" onClick={() => setShowMore((v) => !v)} type="button">{showMore ? " Show less" : "... Show more"}</button>
              </p>

              {!customise ? (
                <div className="cookie-quick">
                  <button className="btn btn--secondary" onClick={() => accept(false)} type="button">Reject All</button>
                  <button className="btn btn--secondary" onClick={() => setCustomise(true)} type="button">Customise</button>
                  <button className="btn" onClick={() => accept(true)} type="button">Accept All</button>
                </div>
              ) : (
                <ul className="cookie-categories">
                  {CATEGORIES.map((cat) => {
                    const open = openCategory === cat.key;
                    const enabled = cat.locked ? true : !!prefs[cat.key as keyof typeof prefs];
                    return (
                      <li className="cookie-category" key={cat.key}>
                        <button aria-expanded={open} className="cookie-category__head" onClick={() => setOpenCategory(open ? null : cat.key)} type="button">
                          <span className="cookie-category__title">{cat.title}</span>
                          {cat.locked ? (
                            <span className="cookie-badge">Always Active</span>
                          ) : (
                            <span className={`cookie-toggle${enabled ? " is-on" : ""}`} aria-hidden="true"><i /></span>
                          )}
                          <ChevronDown aria-hidden="true" className={`cookie-category__chevron${open ? " is-open" : ""}`} size={16} />
                        </button>
                        {open ? (
                          <div className="cookie-category__body">
                            <p>{cat.description}</p>
                            {!cat.locked ? (
                              <label className="cookie-category__switch">
                                <span>{enabled ? "Enabled" : "Disabled"}</span>
                                <button aria-checked={enabled} className={`cookie-toggle${enabled ? " is-on" : ""}`} onClick={() => toggleCategory(cat.key, !enabled)} role="switch" type="button"><i /></button>
                              </label>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="cookie-modal__footer">
              {customise ? (
                <>
                  <button className="btn btn--secondary" onClick={() => accept(false)} type="button">Reject All</button>
                  <button className="btn btn--secondary" onClick={savePrefs} type="button">Save My Preferences</button>
                  <button className="btn" onClick={() => accept(true)} type="button">Accept All</button>
                </>
              ) : (
                <button className="btn btn--secondary" onClick={() => setVisible(false)} type="button">Close</button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
