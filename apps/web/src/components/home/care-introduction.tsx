import { Check } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const points = ["Accessible care information", "Coordinated service pathways", "Clear patient communication"];

export function CareIntroduction() {
  return (
    <section className="section care-introduction" aria-labelledby="care-intro-title">
      <div className="site-container split-layout split-layout--media-left">
        <div className="care-media" role="img" aria-label="Doctor providing patient care">
          <Image alt="Doctor providing patient care" className="site-photo" fill sizes="(max-width: 900px) 100vw, 48vw" src="/images/services/Patient care image.jpg" />
        </div>
        <div className="section-copy">
          <p className="eyebrow">Care with clarity</p>
          <h2 id="care-intro-title">Care built around your needs.</h2>
          <p>Find the right department, understand available services and keep track of your appointment request from one clear patient journey.</p>
          <ul className="check-list">{points.map((point) => <li key={point}><Check aria-hidden="true" />{point}</li>)}</ul>
          <Link className="text-link" href="/about">Learn about our approach <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </section>
  );
}
