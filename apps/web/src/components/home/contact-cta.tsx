import { ArrowRight, MessagesSquare } from "lucide-react";
import Link from "next/link";

export function ContactCta() {
  return (
    <section className="section contact-cta" aria-labelledby="contact-cta-title">
      <div className="site-container contact-cta__inner">
        <span className="contact-cta__icon"><MessagesSquare aria-hidden="true" /></span>
        <div><p className="eyebrow">Find your next step</p><h2 id="contact-cta-title">Need help finding the right service?</h2><p>Contact our care team or explore our departments.</p></div>
        <div className="actions"><Link className="btn" href="/contact">Contact us</Link><Link className="text-link" href="/departments">Explore departments <ArrowRight aria-hidden="true" /></Link></div>
      </div>
    </section>
  );
}
