import { CircleHelp, Clock3, LockKeyhole, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/layout/page-hero";
import { BookingForm } from "@/features/appointments/components/booking-form";
import { portalBookingPathWithContext } from "@/features/appointments/utils/portal-booking";
import { requirePatient } from "@/server/auth/require-patient";
import { AuthenticationError, NotFoundError } from "@/server/errors";
import { listPublicClinicians } from "@/server/repositories/clinician.repository";
import { getPublicDepartments } from "@/server/services/department.service";
import { getPublicFacilities } from "@/server/services/facility.service";
import { getPublicServices } from "@/server/services/service.service";

export const metadata = { title: "Request an appointment" };

type SearchParams = {
  facility?: string;
  department?: string;
  service?: string;
  doctor?: string;
  date?: string;
  scheduled_start?: string;
};

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  let isPatient = false;
  try {
    await requirePatient();
    isPatient = true;
  } catch (error) {
    if (!(error instanceof AuthenticationError || error instanceof NotFoundError)) throw error;
  }
  if (isPatient) {
    redirect(portalBookingPathWithContext({
      facility: params.facility,
      department: params.department,
      service: params.service,
      doctor: params.doctor,
      date: params.date,
      scheduledStart: params.scheduled_start,
    }));
  }

  const [facilities, departments, services, clinicians] = await Promise.all([
    getPublicFacilities(),
    getPublicDepartments(),
    getPublicServices(),
    listPublicClinicians(),
  ]);
  const selectedDoctor = params.doctor
    ? clinicians.find((item) => item.key === params.doctor)
    : undefined;

  return <><PageHero eyebrow="Appointment request" title="Tell us your preferred time for care." description="Choose a facility, department, service, Doctor and a real available time, then sign in securely to submit your request." /><section className="section appointment-section"><div className="site-container appointment-layout"><div><div className="request-alert" role="note"><Clock3 aria-hidden="true" /><p><strong>This is an appointment request.</strong> Your selected time is not guaranteed or confirmed until clinic staff review it.</p></div>{facilities.length && departments.length ? <BookingForm clinicians={clinicians} initialClinician={selectedDoctor?.key} departments={departments} facilities={facilities} initialSelection={{ facility: params.facility, department: params.department, service: params.service, date: params.date, scheduledStart: params.scheduled_start }} services={services} /> : <div className="empty-state">Online appointment requests are currently being configured. Please use the contact page for available clinic information.</div>}</div><aside className="appointment-help" aria-labelledby="appointment-help-title"><p className="eyebrow">Before you submit</p><h2 id="appointment-help-title">How requests work.</h2><ol><li><span>1</span><div><strong>Choose an available time</strong><p>Select care details, a Doctor and a generated appointment time.</p></div></li><li><span>2</span><div><strong>Sign in securely</strong><p>Your selected Doctor and booking details continue into the patient portal.</p></div></li><li><span>3</span><div><strong>Track the status</strong><p>Use the patient portal to see the current request status.</p></div></li></ol><div className="help-link"><LockKeyhole aria-hidden="true" /><div><strong>Patient portal</strong><p>Securely review requests and eligible cancellations.</p><Link href="/portal">Open patient portal <span aria-hidden="true">→</span></Link></div></div><div className="help-link"><MessageSquareText aria-hidden="true" /><div><strong>Need help?</strong><p>Use the configured clinic contact information when available.</p><Link href="/contact">Contact us <span aria-hidden="true">→</span></Link></div></div><p className="urgent-note"><CircleHelp aria-hidden="true" />Do not use this form for emergency care. Contact your local emergency service.</p></aside></div></section></>;
}
