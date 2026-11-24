"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { safeServerMessage } from "@/server/errors";
import { logServerError } from "@/server/logging";
import { addBed, admitPatient, createWard, dischargeAdmission } from "@/server/services/ward.service";

const admitSchema = z.object({
  patient_id: z.string().uuid(),
  ward_id: z.string().uuid(),
  bed_id: z.string().uuid().optional().or(z.literal("")),
  facility_id: z.string().uuid(),
  encounter_id: z.string().uuid().optional().or(z.literal("")),
  reason_for_admission: z.string().trim().max(2000).optional().or(z.literal("")),
  diagnosis_on_admission: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function admitPatientAction(_prev: unknown, formData: FormData) {
  try {
    const input = admitSchema.parse(Object.fromEntries(formData));
    const id = await admitPatient({
      patientId: input.patient_id, wardId: input.ward_id, bedId: input.bed_id || null,
      facilityId: input.facility_id, encounterId: input.encounter_id || null,
      reasonForAdmission: input.reason_for_admission || null, diagnosisOnAdmission: input.diagnosis_on_admission || null,
    });
    revalidatePath("/staff/wards");
    return { success: true, admissionId: id };
  } catch (error) {
    logServerError("ward", "admit-failed", error);
    return { error: safeServerMessage(error, "We couldn't admit the patient.") };
  }
}

const dischargeSchema = z.object({
  admission_id: z.string().uuid(),
  discharge_summary: z.string().trim().max(5000).optional().or(z.literal("")),
});

export async function dischargeAdmissionAction(_prev: unknown, formData: FormData) {
  try {
    const input = dischargeSchema.parse(Object.fromEntries(formData));
    await dischargeAdmission(input.admission_id, input.discharge_summary || null);
    revalidatePath("/staff/wards");
    revalidatePath(`/staff/wards/admissions/${input.admission_id}`);
    return { success: true };
  } catch (error) {
    logServerError("ward", "discharge-failed", error);
    return { error: safeServerMessage(error, "We couldn't discharge the patient.") };
  }
}

const wardSchema = z.object({
  facility_id: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  ward_type: z.enum(["general", "maternity", "pediatric", "icu", "high_dependency", "isolation", "private"]).default("general"),
  department_id: z.string().uuid().optional().or(z.literal("")),
});

export async function createWardAction(_prev: unknown, formData: FormData) {
  try {
    const input = wardSchema.parse(Object.fromEntries(formData));
    await createWard({ facilityId: input.facility_id, name: input.name, wardType: input.ward_type, departmentId: input.department_id || null });
    revalidatePath("/staff/wards");
    return { success: true };
  } catch (error) {
    logServerError("ward", "ward-create-failed", error);
    return { error: safeServerMessage(error, "We couldn't create the ward.") };
  }
}

const bedSchema = z.object({
  ward_id: z.string().uuid(),
  bed_number: z.string().trim().min(1).max(40),
});

export async function addBedAction(_prev: unknown, formData: FormData) {
  try {
    const input = bedSchema.parse(Object.fromEntries(formData));
    await addBed({ wardId: input.ward_id, bedNumber: input.bed_number });
    revalidatePath("/staff/wards");
    return { success: true };
  } catch (error) {
    logServerError("ward", "bed-create-failed", error);
    return { error: safeServerMessage(error, "We couldn't add the bed.") };
  }
}
