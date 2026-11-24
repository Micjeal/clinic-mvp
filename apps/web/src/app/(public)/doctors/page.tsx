import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { DoctorsSearch } from "@/components/home/doctors-search";
import { publicBookingPath } from "@/features/appointments/utils/portal-booking";
import { listPublicCliniciansWithAvailability } from "@/server/services/public-clinician.service";

const slotLabel = (value: string, zone?: string | null) => new Intl.DateTimeFormat("en-UG", { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: zone || "Africa/Kampala" }).format(new Date(value));

export const metadata = { title: "Our Doctors" };

export default async function DoctorsPage({ searchParams }: { searchParams: Promise<{ q?: string; department?: string; specialization?: string; service?: string; facility?: string; availability?: string }> }) {
  const params = await searchParams;
  const clinicians = await listPublicCliniciansWithAvailability();
  const q = params.q?.trim().toLowerCase() ?? "";
  const filtered = clinicians.filter((doctor) => (!q || `${doctor.displayName} ${doctor.professionalTitle ?? ""} ${doctor.departments.map((item) => item.name).join(" ")} ${doctor.specializations.map((item) => item.name).join(" ")} ${doctor.services.map((item) => item.name).join(" ")}`.toLowerCase().includes(q)) && (!params.department || doctor.departments.some((item) => item.id === params.department)) && (!params.specialization || doctor.specializations.some((item) => item.id === params.specialization)) && (!params.service || doctor.services.some((item) => item.id === params.service)) && (!params.facility || doctor.facilities.some((item) => item.id === params.facility)) && (!params.availability || params.availability === "any" || Boolean(doctor.nextSlot)));
  const departments = Array.from(new Map(clinicians.flatMap((doctor) => doctor.departments.map((item) => [item.id, item] as const))).values()).sort((a, b) => a.name.localeCompare(b.name));
  const specializations = Array.from(new Map(clinicians.flatMap((doctor) => doctor.specializations.map((item) => [item.id, item] as const))).values()).sort((a, b) => a.name.localeCompare(b.name));
  const services = Array.from(new Map(clinicians.flatMap((doctor) => doctor.services.map((item) => [item.id, item] as const))).values()).sort((a, b) => a.name.localeCompare(b.name));
  const facilities = Array.from(new Map(clinicians.flatMap((doctor) => doctor.facilities.map((item) => [item.id, item] as const))).values()).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <section className="doctors-hero" aria-labelledby="doctors-hero-title">
        <div className="site-container doctors-hero__inner">
          <div className="doctors-hero__text">
            <p className="doctors-hero__eyebrow"><span className="doctors-hero__dot" aria-hidden="true" />Our Doctors</p>
            <h1 id="doctors-hero-title">Meet our clinical team.</h1>
            <div className="doctors-hero__bar" aria-hidden="true" />
            <p className="doctors-hero__lead">Experienced clinicians across primary care, diagnostics and specialist services — choose who you would like to see.</p>
          </div>
          <div className="doctors-hero__media">
            <Image alt="Medical team" fill priority sizes="(max-width: 900px) 100vw, 55vw" src="/images/branding/Licensed clinic.jpg" style={{ objectFit: "cover", objectPosition: "center top" }} />
          </div>
        </div>
        <div className="doctors-hero__dots" aria-hidden="true" />
      </section>

      <section className="section doctors-directory">
        <div className="site-container">
          <div className="doctors-search-card">
            <h2>Find your doctor</h2>
            <Suspense fallback={null}><DoctorsSearch /></Suspense>
          </div>

          <form className="doctor-filters" method="get">
            <label>Department<select defaultValue={params.department ?? ""} name="department"><option value="">All departments</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Specialization<select defaultValue={params.specialization ?? ""} name="specialization"><option value="">All specializations</option>{specializations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Service<select defaultValue={params.service ?? ""} name="service"><option value="">All services</option>{services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Facility<select defaultValue={params.facility ?? ""} name="facility"><option value="">All facilities</option>{facilities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Availability<select defaultValue={params.availability ?? "any"} name="availability"><option value="any">Any availability</option><option value="available">Upcoming availability</option></select></label>
            <button className="btn" type="submit">Apply filters</button>
          </form>

          {filtered.length ? (
            <div className="doctors-grid">
              {filtered.map((doctor) => (
                <Link className="doctor-tile" href={doctor.slug ? `/doctors/${doctor.slug}` : "/doctors"} key={doctor.slug ?? doctor.displayName}>
                  <div className="doctor-tile__photo">
                    {doctor.photoPath ? <span aria-hidden="true" className="doctor-avatar-image" style={{ backgroundImage: `url(${doctor.photoPath})` }} /> : <span className="doctor-tile__monogram" aria-hidden="true">{doctor.displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>}
                  </div>
                  <div className="doctor-tile__body">
                    <p className="doctor-tile__title">{doctor.professionalTitle || "Clinician"}</p>
                    <h3 className="doctor-tile__name">{doctor.displayName}</h3>
                    <p className="doctor-tile__specialty">{doctor.specializations.slice(0, 2).map((item) => item.name).join(" · ") || doctor.departments.map((item) => item.name).join(" · ")}</p>
                    <p className="doctor-tile__availability">{doctor.acceptingAppointments && doctor.nextSlot ? `Next: ${slotLabel(doctor.nextSlot.startsAt, doctor.nextSlot.timeZone)}` : doctor.acceptingAppointments ? "No upcoming availability" : "Not accepting online bookings"}</p>
                    {doctor.acceptingAppointments && doctor.slug ? <span className="doctor-tile__book">Book appointment →</span> : null}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state"><h2>No published doctors match these filters.</h2><p>Try another department, specialization or service.</p></div>
          )}
        </div>
      </section>
    </>
  );
}
