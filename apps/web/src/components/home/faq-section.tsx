import { ChevronDown } from "lucide-react";
import Link from "next/link";

const faqs = [
  { question: "How do I request an appointment?", answer: "Choose a facility, department and optional service, then provide your preferred date, time and patient details on the appointment request form." },
  { question: "Is my requested time automatically confirmed?", answer: "No. Your submission is a request. Clinic staff review it before it becomes a confirmed appointment." },
  { question: "Do I need an account?", answer: "You will be asked to sign in during the request process so the request can be linked securely to your patient portal." },
  { question: "Can I cancel an appointment?", answer: "Eligible appointment requests can be cancelled from the patient portal. Availability depends on the current request status." },
  { question: "Where can I view my appointment status?", answer: "Sign in to the patient portal and open Appointments to view the current status of your requests." },
] as const;

export function FaqSection() {
  return (
    <section className="section faq-section" id="faq" aria-labelledby="faq-title">
      <div className="site-container faq-layout">
        <div className="section-heading"><p className="eyebrow">Frequently asked questions</p><h2 id="faq-title">What to know before you request care.</h2><p>These answers reflect the appointment workflow currently available on this website.</p><Link className="text-link" href="/contact">Still need help? Contact us <span aria-hidden="true">→</span></Link></div>
        <div className="faq-list">{faqs.map((faq) => <details key={faq.question}><summary>{faq.question}<ChevronDown aria-hidden="true" /></summary><p>{faq.answer}</p></details>)}</div>
      </div>
    </section>
  );
}
