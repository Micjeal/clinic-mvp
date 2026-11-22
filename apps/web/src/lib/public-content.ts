import { site } from "@/config/site";

const placeholderPattern = /not configured|being prepared|\btest\b|placeholder/i;

export function isPlaceholderValue(value: string | null | undefined) {
  return !value || placeholderPattern.test(value);
}

export function clinicName() {
  return isPlaceholderValue(site.name) ? "Patient care clinic" : site.name;
}

export function clinicDescription() {
  return isPlaceholderValue(site.description)
    ? "Clear pathways to care, convenient appointment requests and secure access to your patient information."
    : site.description;
}

export function safeFacilityName(name: string) {
  return isPlaceholderValue(name) ? "Configured care location" : name;
}

export function safePortalName(value: string | null | undefined, fallback: string) {
  return isPlaceholderValue(value) ? fallback : value;
}

export function contactLabel(value: string, fallback: string) {
  return isPlaceholderValue(value) ? fallback : value;
}

export function safePublicCopy(value: string | null | undefined, fallback: string) {
  return isPlaceholderValue(value) ? fallback : value ?? fallback;
}

export function safeFacilityLocation(facility: {
  address_line: string | null;
  city: string | null;
  district: string | null;
}) {
  const parts = [facility.address_line, facility.city, facility.district].filter(
    (value): value is string => Boolean(value),
  );

  if (!parts.length || parts.some(isPlaceholderValue)) {
    return "Location information is being prepared.";
  }

  return parts.join(", ");
}
