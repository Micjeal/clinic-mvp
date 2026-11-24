import Link from "next/link";
import type { PublicDirectoryClinician } from "@/server/repositories/clinician.repository";

export function DoctorsPreview({ doctors }: { doctors: PublicDirectoryClinician[] }) {
  if (!doctors.length) return null;
  return (
    <section className="section doctors-preview" aria-labelledby="doctors-preview-title">
      <div className="site-container">
        <div className="section-heading section-heading--row">
          <div>
            <p className="eyebrow">Our clinicians</p>
            <h2 id="doctors-preview-title">Find a doctor for your care.</h2>
          </div>
          <Link className="text-link" href="/doctors">Meet our doctors <span aria-hidden="true">→</span></Link>
        </div>
        <div className="doctors-preview__grid">
          {doctors.slice(0, 3).map((doctor) => (
            <Link className="doctor-tile doctor-tile--preview" href={`/doctors/${doctor.slug}`} key={doctor.slug}>
              <div className="doctor-tile__photo">
                {doctor.photoPath
                  ? <span aria-hidden="true" className="doctor-avatar-image" style={{ backgroundImage: `url(${doctor.photoPath})` }} />
                  : <span className="doctor-tile__monogram" aria-hidden="true">{doctor.displayName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}</span>}
              </div>
              <div className="doctor-tile__body">
                <p className="doctor-tile__title">{doctor.professionalTitle || "Clinician"}</p>
                <h3 className="doctor-tile__name">{doctor.displayName}</h3>
                <p className="doctor-tile__specialty">{doctor.specializations?.[0]?.name || doctor.departments.map((item) => item.name).join(" · ")}</p>
                <span className="doctor-tile__book">View profile →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
