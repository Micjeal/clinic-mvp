import Link from "next/link";
export default function AppointmentNotFound(){return <section className="staff-panel staff-error-state"><p className="eyebrow">Appointment</p><h1>Appointment not found.</h1><p>It may no longer be available, or it may belong to another organization.</p><Link className="btn" href="/staff/appointments">Return to appointments</Link></section>;}
