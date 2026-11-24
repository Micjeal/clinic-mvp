import Image from "next/image";

const STATS = [
  { value: "2", label: "Countries", caption: "Uganda & Mauritius", icon: "globe" },
  { value: "2,100", label: "Employees", caption: "Approx.", icon: "users" },
  { value: "3", label: "Medical Laboratories", caption: "", icon: "flask" },
  { value: "37", label: "Collection Centres", caption: "19 in Mauritius & 18 in Uganda", icon: "drop" },
  { value: "20", label: "Primary Care Clinics", caption: "", icon: "clinic" },
  { value: "60,000", label: "Emergency Cases", caption: "Handled yearly", icon: "pulse" },
  { value: "40,000", label: "Admission Yearly", caption: "", icon: "bed" },
  { value: "3", label: "Hospitals", caption: "395 Beds · 11 Operation Theaters", icon: "hospital" },
] as const;

function StatIcon({ name }: { name: string }) {
  const common = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (name) {
    case "globe": return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>;
    case "users": return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case "flask": return <svg {...common}><path d="M9 3h6M10 3v6l-5 8.5A2 2 0 0 0 6.8 21h10.4a2 2 0 0 0 1.8-3.5L14 9V3" /><path d="M7.5 15h9" /></svg>;
    case "drop": return <svg {...common}><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /></svg>;
    case "clinic": return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 21v-4h6v4M12 8v6M9 11h6" /></svg>;
    case "pulse": return <svg {...common}><path d="M3 12h4l2-7 4 14 2-7h6" /></svg>;
    case "bed": return <svg {...common}><path d="M3 18v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8" /><path d="M3 14h18M6 10V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" /></svg>;
    default: return <svg {...common}><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" /></svg>;
  }
}

export function AboutHero() {
  return (
    <>
      <section className="about-hero" aria-labelledby="about-hero-title">
        <div className="site-container about-hero__inner">
          <div className="about-hero__text">
            <p className="about-hero__eyebrow"><span className="about-hero__dot" aria-hidden="true" />About Us</p>
            <h1 id="about-hero-title">Care that puts people first.</h1>
            <div className="about-hero__bar" aria-hidden="true" />
            <p className="about-hero__lead">From clinics to hospitals, we are building accessible, technology-enabled healthcare across the region — so quality care is closer to every patient.</p>
          </div>
          <div className="about-hero__media">
            <Image alt="Patient and clinician" fill priority sizes="(max-width: 900px) 100vw, 55vw" src="/images/branding/Licensed clinic.jpg" style={{ objectFit: "cover" }} />
          </div>
        </div>
        <div className="about-hero__dots" aria-hidden="true" />
      </section>
      <section className="about-stats" aria-label="Key facts">
        <div className="site-container about-stats__grid">
          {STATS.map((stat) => (
            <article className="about-stat" key={stat.label}>
              <span className="about-stat__icon"><StatIcon name={stat.icon} /></span>
              <strong className="about-stat__value">{stat.value}</strong>
              <span className="about-stat__label">{stat.label}</span>
              {stat.caption ? <span className="about-stat__caption">{stat.caption}</span> : null}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
