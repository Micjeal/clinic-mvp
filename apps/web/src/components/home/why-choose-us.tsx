import { CalendarClock, FolderLock, MessagesSquare, Route, ScanHeart, Waypoints } from "lucide-react";

const benefits = [
  { title: "Patient-focused care", description: "Information and pathways organised around patient needs.", icon: ScanHeart },
  { title: "Coordinated pathways", description: "Move from department discovery to the right service.", icon: Waypoints },
  { title: "Convenient requests", description: "Submit a preferred appointment time from the website.", icon: CalendarClock },
  { title: "Secure patient portal", description: "Review your own appointment requests after signing in.", icon: FolderLock },
  { title: "Clear communication", description: "Understand when a request is pending clinic review.", icon: MessagesSquare },
  { title: "Modern digital access", description: "Use the care journey on mobile, tablet or desktop.", icon: Route },
] as const;

export function WhyChooseUs() {
  return (
    <section className="section section--navy" aria-labelledby="why-title">
      <div className="site-container split-layout">
        <div className="section-heading section-heading--sticky">
          <p className="eyebrow">Why choose us</p><h2 id="why-title">A clearer way to find and request care.</h2>
          <p>Every part of the public experience is designed to help patients make informed next steps without false promises.</p>
        </div>
        <div className="benefit-list">
          {benefits.map((benefit) => { const Icon = benefit.icon; return <article key={benefit.title}><Icon aria-hidden="true" /><div><h3>{benefit.title}</h3><p>{benefit.description}</p></div></article>; })}
        </div>
      </div>
    </section>
  );
}
