export const DOCTOR_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const DOCTOR_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";

const supportedDoctorPhotoTypes = new Set(DOCTOR_PHOTO_ACCEPT.split(","));

export type DoctorPhotoCandidate = { type: string; size: number };

export function validateDoctorPhoto(candidate: DoctorPhotoCandidate) {
  if (!supportedDoctorPhotoTypes.has(candidate.type)) {
    return "Please choose a JPG, PNG or WebP image.";
  }
  if (candidate.size > DOCTOR_PHOTO_MAX_BYTES) {
    return "The selected image is too large. Choose an image smaller than 5 MB.";
  }
  return null;
}

export type PublishingReadiness = {
  isActiveDoctor: boolean;
  hasPublicProfile: boolean;
  hasDepartment: boolean;
  hasBookableService: boolean;
  hasAvailability: boolean;
};

export function missingOnlineBookingRequirements(readiness: PublishingReadiness) {
  const missing: string[] = [];
  if (!readiness.isActiveDoctor) missing.push("Active Doctor account");
  if (!readiness.hasPublicProfile) missing.push("Public profile");
  if (!readiness.hasDepartment) missing.push("Department assignment");
  if (!readiness.hasBookableService) missing.push("Bookable service");
  if (!readiness.hasAvailability) missing.push("Weekly availability");
  return missing;
}

export function doctorPhotoObjectPath(photoPath: string | null | undefined) {
  if (!photoPath) return null;
  const marker = "/storage/v1/object/public/clinician-photos/";
  const markerIndex = photoPath.indexOf(marker);
  if (markerIndex === -1) return photoPath.startsWith("http") ? null : photoPath;
  return decodeURIComponent(photoPath.slice(markerIndex + marker.length));
}

export function opaqueDoctorPhotoObjectPath(extension: "jpg" | "png" | "webp", key: string) {
  return `clinicians/${key}.${extension}`;
}
