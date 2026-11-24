import { CircleHelp, Clock3 } from "lucide-react";
import Link from "next/link";
import { BookingForm } from "@/features/appointments/components/booking-form";
import { clinicianIsCompatible } from "@/features/appointments/utils/portal-booking";
import { requirePatient } from "@/server/auth/require-patient";
import { listPublicClinicians } from "@/server/repositories/clinician.repository";
import { getAvailableBookingSlots } from "@/server/services/booking.service";
import { getPublicDepartments } from "@/server/services/department.service";
import { getPublicFacilities } from "@/server/services/facility.service";
import { getPublicServices } from "@/server/services/service.service";

export const metadata = { title: "New appointment" };

type SearchParams = {
  facility?: string;
  department?: string;
  service?: string;
  doctor?: string;
  date?: string;
  scheduled_start?: string;
};

export default async function NewPortalAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { patient, user } = await requirePatient();
  const [facilities, departments, services, clinicians] = await Promise.all([
    getPublicFacilities(),
    getPublicDepartments(),
    getPublicServices(),
    listPublicClinicians(),
  ]);

  let initialClinician = params.doctor
    ? clinicians.find((clinician) => clinician.key === params.doctor)
    : undefined;
  let initialError = "";
  if (params.doctor && !initialClinician) {
    initialError = "That Doctor is no longer available for online booking. Choose another Doctor.";
  } else if (initialClinician && !clinicianIsCompatible(initialClinician, {
    facilityId: params.facility,
    departmentId: params.department,
    serviceId: params.service,
  })) {
    initialError = `${initialClinician.displayName} is not available for that selection. Choose another Doctor.`;
    initialClinician = undefined;
  }

  let initialSlots: { startsAt: string; endsAt: string }[] = [];
  if (initialClinician && params.facility && params.department && params.service && params.date) {
    try {
      initialSlots = await getAvailableBookingSlots({
        facilityId: params.facility,
        departmentId: params.department,
        serviceId: params.service,
        clinicianSlug: initialClinician.key,
        date: params.date,
      });
    } catch {
      initialError = "Those booking options are no longer available. Please review your selection.";
    }
  }

  const patientName = [patient.first_name, patient.middle_name, patient.last_name]
    .filter(Boolean)
    .join(" ") || "Patient";

  return (
    <div className="patient-portal-page patient-booking-page">
      <Link className="patient-back-link" href="/portal/appointments">
        <span aria-hidden="true">←</span>Back to appointments
      </Link>
      <header className="patient-page-heading patient-page-heading--compact">
        <div>
          <p className="eyebrow">Book appointment</p>
          <h1>Book an appointment</h1>
          <p>Choose your preferred consultation details. The clinic will review your request.</p>
        </div>
        <Link className="patient-booking-help-link" href="/portal/help">
          <CircleHelp aria-hidden="true" />Need help?
        </Link>
      </header>
      <div className="request-alert" role="note">
        <Clock3 aria-hidden="true" />
        <p><strong>Requests are reviewed by the clinic.</strong> Your preferred time is not confirmed until the clinic responds.</p>
      </div>
      {facilities.length && departments.length ? (
        <BookingForm
          clinicians={clinicians}
          departments={departments}
          facilities={facilities}
          initialClinician={initialClinician?.key}
          initialError={initialError}
          initialSelection={{
            facility: params.facility,
            department: params.department,
            service: params.service,
            date: params.date,
            scheduledStart: params.scheduled_start,
          }}
          initialSlots={initialSlots}
          patient={{
            name: patientName,
            patientNumber: patient.patient_number || "",
            phone: patient.phone || "",
            email: patient.email || user.email || "",
          }}
          services={services}
          variant="portal"
        />
      ) : (
        <div className="empty-state">Online appointment requests are currently unavailable. Please contact the clinic for help.</div>
      )}
      <details className="patient-booking-help-details">
        <summary>How appointment requests work</summary>
        <ol>
          <li><span>1</span><div><strong>Choose your preference</strong><p>Select a location, department, service, Doctor and time.</p></div></li>
          <li><span>2</span><div><strong>Send your request</strong><p>We use the patient details already linked to your account.</p></div></li>
          <li><span>3</span><div><strong>Track the status</strong><p>Follow progress from your appointments workspace.</p></div></li>
        </ol>
        <p className="patient-booking-help__urgent"><CircleHelp aria-hidden="true" />Do not use this form for emergency care.</p>
      </details>
    </div>
  );
}
