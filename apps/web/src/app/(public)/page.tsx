import { CareIntroduction } from "@/components/home/care-introduction";
import { ContactCta } from "@/components/home/contact-cta";
import { DoctorsPreview } from "@/components/home/doctors-preview";
import { DepartmentSection } from "@/components/home/department-section";
import { FacilityFeature } from "@/components/home/facility-feature";
import { FaqSection } from "@/components/home/faq-section";
import { HeroSection } from "@/components/home/hero-section";
import { PatientJourney } from "@/components/home/patient-journey";
import { PatientPortalCta } from "@/components/home/patient-portal-cta";
import { QuickActions } from "@/components/home/quick-actions";
import { ServicesSection } from "@/components/home/services-section";
import { WhyChooseUs } from "@/components/home/why-choose-us";
import { getPublicDepartments } from "@/server/services/department.service";
import { getPublicFacilities } from "@/server/services/facility.service";
import { getPublicServices } from "@/server/services/service.service";
import { listPublicDirectoryClinicians } from "@/server/repositories/clinician.repository";

export default async function Home() {
  const [departments, services, facilities, doctors] = await Promise.all([
    getPublicDepartments(),
    getPublicServices(),
    getPublicFacilities(),
    listPublicDirectoryClinicians(),
  ]);

  return (
    <>
      <HeroSection />
      <QuickActions />
      <CareIntroduction />
      <DepartmentSection departments={departments} />
      <ServicesSection departments={departments} services={services} />
      <DoctorsPreview doctors={doctors} />
      <WhyChooseUs />
      <PatientJourney />
      <FacilityFeature facilities={facilities} />
      <PatientPortalCta />
      <FaqSection />
      <ContactCta />
    </>
  );
}
