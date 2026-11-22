import {CalendarX2} from "lucide-react";
import Link from "next/link";

export default function PatientAppointmentNotFound(){return <div className="patient-portal-page"><div className="patient-list-empty"><CalendarX2 aria-hidden="true"/><h1>Appointment not found</h1><p>This appointment is unavailable or does not belong to your patient account.</p><Link className="btn" href="/portal/appointments">Back to Appointments</Link></div></div>;}
