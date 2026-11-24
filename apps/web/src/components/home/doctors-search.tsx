"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function DoctorsSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (value.trim()) next.set("q", value.trim()); else next.delete("q");
    router.push(`/doctors?${next.toString()}`);
  };

  return (
    <form className="doctors-search" onSubmit={submit} role="search">
      <Search aria-hidden="true" className="doctors-search__icon" />
      <input
        aria-label="Search doctors by name, specialty or keyword"
        onChange={(e) => setValue(e.target.value)}
        placeholder="Name Of Doctor, Specialty Or Keyword"
        type="search"
        value={value}
      />
    </form>
  );
}
