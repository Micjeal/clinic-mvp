"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = window.localStorage.getItem("hospica.theme");
    const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = saved ? saved === "dark" : prefers;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    window.localStorage.setItem("hospica.theme", next ? "dark" : "light");
  };
  return <button aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} className="theme-toggle" onClick={toggle} title={dark ? "Light mode" : "Dark mode"} type="button">{dark ? <Sun aria-hidden="true" size={17} /> : <Moon aria-hidden="true" size={17} />}</button>;
}
