import {ArrowRight,CalendarDays,Mail,MapPin,MessageCircle,Phone} from "lucide-react";
import Link from "next/link";

import {site} from "@/config/site";
import {isPlaceholderValue} from "@/lib/public-content";
import {PatientPageHeader} from "@/features/patient/components/patient-content";

export const metadata={title:"Help and contact"};

export default function PatientHelpPage(){
  const phoneAvailable=!isPlaceholderValue(site.phone),emailAvailable=!isPlaceholderValue(site.email),addressAvailable=!isPlaceholderValue(site.address);
  return <div className="patient-portal-page">
    <PatientPageHeader eyebrow="Help & Contact" title="Need help?" description="Find the right next step for appointment questions or clinic contact information." action={<span className="patient-heading-icon"><MessageCircle aria-hidden="true"/></span>} />
    <div className="patient-help-grid">
      <section aria-labelledby="appointment-help-title" className="patient-help-card patient-help-card--primary"><span><CalendarDays aria-hidden="true"/></span><div><p className="eyebrow">Appointments</p><h2 id="appointment-help-title">Appointment questions</h2><p>Check the latest status of your request, review visit details, or start a new request.</p><div className="patient-help-actions"><Link className="btn" href="/portal/appointments">View Appointments</Link><Link href="/portal/appointments/new">Book Appointment<ArrowRight aria-hidden="true"/></Link></div></div></section>
      <section aria-labelledby="contact-clinic-title" className="patient-help-card"><span><MessageCircle aria-hidden="true"/></span><div><p className="eyebrow">Clinic support</p><h2 id="contact-clinic-title">Contact the clinic</h2>{phoneAvailable||emailAvailable||addressAvailable?<ul className="patient-contact-list">{phoneAvailable?<li><Phone aria-hidden="true"/><a href={`tel:${site.phone}`}>{site.phone}</a></li>:null}{emailAvailable?<li><Mail aria-hidden="true"/><a href={`mailto:${site.email}`}>{site.email}</a></li>:null}{addressAvailable?<li><MapPin aria-hidden="true"/><span>{site.address}</span></li>:null}</ul>:<p>Direct clinic contact details are being prepared. The public contact page will show them when configured.</p>}<Link className="patient-public-contact-link" href="/contact">Open public contact page<ArrowRight aria-hidden="true"/></Link></div></section>
    </div>
  </div>;
}
