import {CalendarPlus} from "lucide-react";
import Link from "next/link";

import {requirePatient} from "@/server/auth/require-patient";
import {PatientPageHeader} from "@/features/patient/components/patient-content";
import PatientProfileForm from "@/components/forms/patient-profile-form";

export const metadata={title:"My profile"};

export default async function PatientProfilePage(){
  const {patient}=await requirePatient();
  return <div className="patient-portal-page">
    <PatientPageHeader eyebrow="My profile" title="Your patient details" description="Update your personal and contact information." action={<Link className="btn btn--secondary" href="/portal/appointments/new"><CalendarPlus aria-hidden="true"/>Book Appointment</Link>} />
    <section aria-labelledby="profile-edit-title" className="patient-profile-card"><div className="patient-profile-card__heading"><div><p className="eyebrow">Patient information</p><h2 id="profile-edit-title">Edit profile</h2></div><span>Editable</span></div><PatientProfileForm patient={patient}/></section>
  </div>;
}
