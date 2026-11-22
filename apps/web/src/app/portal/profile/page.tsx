import {CalendarPlus,CircleUserRound,Info} from "lucide-react";
import Link from "next/link";

import {requirePatient} from "@/server/auth/require-patient";
import {PatientPageHeader} from "@/features/patient/components/patient-content";

export const metadata={title:"My profile"};

function display(value:string|null|undefined){return value?.trim()||"Not provided";}
function formatDate(value:string|null){if(!value)return "Not provided";return new Intl.DateTimeFormat("en-UG",{dateStyle:"long",timeZone:"UTC"}).format(new Date(`${value}T00:00:00Z`));}

export default async function PatientProfilePage(){
  const {patient,user}=await requirePatient();
  const fullName=[patient.first_name,patient.middle_name,patient.last_name].filter(Boolean).join(" ");
  const location=[patient.address_line,patient.city,patient.district,patient.country_code].filter(Boolean).join(", ");
  const fields=[
    ["Full name",display(fullName)],
    ["Patient number",display(patient.patient_number)],
    ["Email",display(patient.email||user.email)],
    ["Phone",display(patient.phone)],
    ["Date of birth",formatDate(patient.date_of_birth)],
    ["Sex",display(patient.sex)],
    ["Address / location",display(location)],
    ["Emergency contact",display(patient.emergency_contact_name)],
    ["Emergency contact phone",display(patient.emergency_contact_phone)],
  ];
  const incomplete=fields.some(([,value])=>value==="Not provided");
  return <div className="patient-portal-page">
    <PatientPageHeader eyebrow="My profile" title="Your patient details" description="Review the personal and contact information linked to your patient account." action={<Link className="btn btn--secondary" href="/portal/appointments/new"><CalendarPlus aria-hidden="true"/>Book Appointment</Link>} />
    <section aria-labelledby="profile-details-title" className="patient-profile-card"><div className="patient-profile-card__heading"><div><p className="eyebrow">Patient information</p><h2 id="profile-details-title">Profile details</h2></div><span>Read only</span></div><dl>{fields.map(([label,value])=><div className={label==="Address / location"?"patient-profile-field--wide":""} key={label}><dt>{label}</dt><dd className={value==="Not provided"?"is-empty":""}>{value}</dd></div>)}</dl></section>
    <aside className="patient-profile-note"><Info aria-hidden="true"/><div><strong>{incomplete?"Some optional details are incomplete":"Profile editing is not available yet"}</strong><p>{incomplete?"You can contact the clinic if important contact information needs to be corrected. Profile editing will be available soon.":"Contact the clinic if any information needs to be corrected."}</p></div></aside>
  </div>;
}
