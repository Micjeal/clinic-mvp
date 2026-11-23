import {CalendarPlus} from "lucide-react";
import Link from "next/link";

import {requirePatient} from "@/server/auth/require-patient";
import {PatientPageHeader} from "@/features/patient/components/patient-content";
import {PatientProfileSection} from "@/features/patient/components/patient-profile-section";

export const metadata={title:"My profile"};

export default async function PatientProfilePage(){
  const {patient}=await requirePatient();
  return <div className="patient-portal-page">
    <PatientPageHeader eyebrow="My profile" title="Your patient details" description="View your personal and contact information, or update it when needed." action={<Link className="btn btn--secondary" href="/portal/appointments/new"><CalendarPlus aria-hidden="true"/>Book Appointment</Link>} />
    <PatientProfileSection patient={patient}/>
  </div>;
}
