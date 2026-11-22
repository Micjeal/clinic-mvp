import "server-only";
import { createClient } from "@/lib/supabase/server";

type PublicSpecialization = { name: string; description: string | null };
type PublicQualification = {
  type: string;
  qualification: string;
  institution: string;
  country: string | null;
  year: number | null;
};
type PublicAchievement = { title: string; description: string | null; year: number | null };

export type PublicClinician = {
  displayName: string;
  professionalTitle: string | null;
  publicBio: string | null;
  photoPath: string | null;
  key: string;
  departmentIds: string[];
  serviceIds: string[];
  facilityIds: string[];
};

export type PublicDirectoryClinician = {
  displayName: string;
  professionalTitle: string | null;
  publicBio: string | null;
  photoPath: string | null;
  yearsExperience: number | null;
  experienceSummary: string | null;
  languages: string[];
  slug: string;
  acceptingAppointments: boolean;
  departments: { id: string; name: string }[];
  specializations: { id: string; name: string; description: string | null }[];
  qualifications: {
    id: string;
    type: string;
    qualification: string;
    institution: string;
    country: string | null;
    year: number | null;
  }[];
  achievements: { id: string; title: string; description: string | null; year: number | null }[];
  services: { id: string; name: string; durationMinutes: number | null }[];
  facilities: { id: string; name: string; city: string | null; timezone: string | null }[];
  facilityServices: { facilityId: string; departmentId: string; departmentName: string; serviceId: string; durationMinutes: number | null }[];
};

type DirectoryRow = {
  slug: string;
  display_name: string;
  professional_title: string | null;
  public_bio: string | null;
  photo_path: string | null;
  years_experience: number | null;
  experience_summary: string | null;
  languages: string[] | null;
  accepting_appointments: boolean;
  department_id: string;
  department_name: string;
  service_id: string | null;
  service_name: string | null;
  service_duration_minutes: number | null;
  facility_id: string | null;
  facility_name: string | null;
  facility_city: string | null;
  facility_timezone: string | null;
  specializations: PublicSpecialization[] | null;
  qualifications: PublicQualification[] | null;
  achievements: PublicAchievement[] | null;
};

function safeKey(slug: string, collection: string, index: number) {
  return `${slug}-${collection}-${index + 1}`;
}

function compose(rows: DirectoryRow[], publicPhotoUrl: (path: string) => string) {
  const grouped = new Map<string, PublicDirectoryClinician>();
  for (const row of rows) {
    const current = grouped.get(row.slug) ?? {
      displayName: row.display_name,
      professionalTitle: row.professional_title,
      publicBio: row.public_bio,
      photoPath: row.photo_path
        ? row.photo_path.startsWith("http") ? row.photo_path : publicPhotoUrl(row.photo_path)
        : null,
      yearsExperience: row.years_experience,
      experienceSummary: row.experience_summary,
      languages: row.languages ?? [],
      slug: row.slug,
      acceptingAppointments: row.accepting_appointments,
      departments: [],
      specializations: (row.specializations ?? []).map((item, index) => ({
        ...item,
        id: safeKey(row.slug, "specialization", index),
      })),
      qualifications: (row.qualifications ?? []).map((item, index) => ({
        ...item,
        id: safeKey(row.slug, "qualification", index),
      })),
      achievements: (row.achievements ?? []).map((item, index) => ({
        ...item,
        id: safeKey(row.slug, "achievement", index),
      })),
      services: [],
      facilities: [],
      facilityServices: [],
    };
    if (!current.departments.some((item) => item.id === row.department_id)) {
      current.departments.push({ id: row.department_id, name: row.department_name });
    }
    if (row.service_id && row.service_name && !current.services.some((item) => item.id === row.service_id)) {
      current.services.push({
        id: row.service_id,
        name: row.service_name,
        durationMinutes: row.service_duration_minutes,
      });
    }
    if (row.facility_id && row.facility_name && !current.facilities.some((item) => item.id === row.facility_id)) {
      current.facilities.push({
        id: row.facility_id,
        name: row.facility_name,
        city: row.facility_city,
        timezone: row.facility_timezone,
      });
    }
    if (
      row.facility_id
      && row.service_id
      && !current.facilityServices.some((item) => item.facilityId === row.facility_id && item.serviceId === row.service_id)
    ) {
      current.facilityServices.push({
        facilityId: row.facility_id,
        departmentId: row.department_id,
        departmentName: row.department_name,
        serviceId: row.service_id,
        durationMinutes: row.service_duration_minutes,
      });
    }
    grouped.set(row.slug, current);
  }
  return [...grouped.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function listPublicDirectoryClinicians() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_clinician_directory");
  if (error) throw error;
  const storage = supabase.storage.from("clinician-photos");
  return compose(
    (data ?? []) as unknown as DirectoryRow[],
    (path) => storage.getPublicUrl(path).data.publicUrl,
  );
}

export async function findPublicDirectoryClinician(slug: string) {
  return (await listPublicDirectoryClinicians()).find((item) => item.slug === slug) ?? null;
}

export async function listPublicClinicians(): Promise<PublicClinician[]> {
  return (await listPublicDirectoryClinicians())
    .filter((item) => item.acceptingAppointments)
    .map((item) => ({
      displayName: item.displayName,
      professionalTitle: item.professionalTitle,
      publicBio: item.publicBio,
      photoPath: item.photoPath,
      key: item.slug,
      departmentIds: item.departments.map(({ id }) => id),
      serviceIds: item.services.map(({ id }) => id),
      facilityIds: item.facilities.map(({ id }) => id),
    }));
}
