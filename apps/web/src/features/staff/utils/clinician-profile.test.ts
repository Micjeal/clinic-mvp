import { describe, expect, it } from "vitest";
import {
  DOCTOR_PHOTO_MAX_BYTES,
  doctorPhotoObjectPath,
  missingOnlineBookingRequirements,
  opaqueDoctorPhotoObjectPath,
  validateDoctorPhoto,
} from "./clinician-profile";

describe("Doctor profile acceptance rules", () => {
  it("accepts supported photos at the size limit", () => {
    expect(validateDoctorPhoto({ type: "image/webp", size: DOCTOR_PHOTO_MAX_BYTES })).toBeNull();
  });

  it("rejects unsupported and oversized photos with specific messages", () => {
    expect(validateDoctorPhoto({ type: "image/gif", size: 10 })).toMatch(/JPG, PNG or WebP/);
    expect(validateDoctorPhoto({ type: "image/jpeg", size: DOCTOR_PHOTO_MAX_BYTES + 1 })).toMatch(/smaller than 5 MB/);
  });

  it("returns only the missing online-booking requirements", () => {
    expect(missingOnlineBookingRequirements({
      isActiveDoctor: true,
      hasPublicProfile: true,
      hasDepartment: true,
      hasBookableService: false,
      hasAvailability: false,
    })).toEqual(["Bookable service", "Weekly availability"]);
  });

  it("extracts only managed clinician-photo object paths", () => {
    expect(doctorPhotoObjectPath("https://example.supabase.co/storage/v1/object/public/clinician-photos/org/member/photo.webp")).toBe("org/member/photo.webp");
    expect(doctorPhotoObjectPath("clinicians/opaque.webp")).toBe("clinicians/opaque.webp");
    expect(doctorPhotoObjectPath("https://example.com/doctor.webp")).toBeNull();
  });

  it("creates opaque photo paths without organization or membership identifiers", () => {
    const path = opaqueDoctorPhotoObjectPath("webp", "550e8400-e29b-41d4-a716-446655440000");
    expect(path).toBe("clinicians/550e8400-e29b-41d4-a716-446655440000.webp");
    expect(path.split("/")).toHaveLength(2);
  });
});
