"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { safeServerMessage } from "@/server/errors";
import { logServerError } from "@/server/logging";
import { createInsuranceClaim, createInsuranceScheme, createPatientPolicy, processInsuranceClaim, submitInsuranceClaim } from "@/server/services/insurance.service";

const claimSchema = z.object({
  invoice_id: z.string().uuid().optional().or(z.literal("")),
  insurance_scheme_id: z.string().uuid(),
  policy_id: z.string().uuid().optional().or(z.literal("")),
  patient_id: z.string().uuid(),
  facility_id: z.string().uuid(),
  claimed_amount: z.coerce.number().positive(),
  currency_code: z.string().trim().length(3).toUpperCase().default("UGX"),
  diagnosis_summary: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function createClaimAction(_prev: unknown, formData: FormData) {
  try {
    const input = claimSchema.parse(Object.fromEntries(formData));
    const id = await createInsuranceClaim({
      invoiceId: input.invoice_id || null, insuranceSchemeId: input.insurance_scheme_id,
      policyId: input.policy_id || null, patientId: input.patient_id, facilityId: input.facility_id,
      claimedAmount: input.claimed_amount, currencyCode: input.currency_code,
      diagnosisSummary: input.diagnosis_summary || null, notes: input.notes || null,
    });
    revalidatePath("/staff/insurance");
    return { success: true, claimId: id };
  } catch (error) {
    logServerError("insurance", "claim-create-failed", error);
    return { error: safeServerMessage(error, "We couldn't create the claim.") };
  }
}

export async function submitClaimAction(claimId: string) {
  try {
    await submitInsuranceClaim(claimId);
    revalidatePath("/staff/insurance");
    revalidatePath(`/staff/insurance/claims/${claimId}`);
    return { success: true };
  } catch (error) {
    logServerError("insurance", "claim-submit-failed", error);
    return { error: safeServerMessage(error, "We couldn't submit the claim.") };
  }
}

const processSchema = z.object({
  claim_id: z.string().uuid(),
  action: z.enum(["under_review", "approved", "denied", "paid"]),
  approved_amount: z.coerce.number().min(0).optional().or(z.literal("")),
  paid_amount: z.coerce.number().min(0).optional().or(z.literal("")),
});

export async function processClaimAction(_prev: unknown, formData: FormData) {
  try {
    const input = processSchema.parse(Object.fromEntries(formData));
    await processInsuranceClaim(
      input.claim_id, input.action,
      input.approved_amount === "" ? undefined : input.approved_amount ?? undefined,
      input.paid_amount === "" ? undefined : input.paid_amount ?? undefined,
    );
    revalidatePath("/staff/insurance");
    revalidatePath(`/staff/insurance/claims/${input.claim_id}`);
    return { success: true };
  } catch (error) {
    logServerError("insurance", "claim-process-failed", error);
    return { error: safeServerMessage(error, "We couldn't process the claim.") };
  }
}

const schemeSchema = z.object({
  name: z.string().trim().min(2).max(160),
  scheme_type: z.enum(["nhif", "private", "employer", "community", "other"]).default("private"),
  contact_phone: z.string().trim().max(40).optional().or(z.literal("")),
  contact_email: z.string().trim().email().optional().or(z.literal("")),
  preauth_required: z.coerce.boolean().default(false),
  coverage_percent: z.coerce.number().min(0).max(100).default(100),
});

export async function createSchemeAction(_prev: unknown, formData: FormData) {
  try {
    const input = schemeSchema.parse(Object.fromEntries(formData));
    await createInsuranceScheme({
      name: input.name, schemeType: input.scheme_type,
      contactPhone: input.contact_phone || null, contactEmail: input.contact_email || null,
      preauthRequired: input.preauth_required, coveragePercent: input.coverage_percent,
    });
    revalidatePath("/staff/insurance/schemes");
    return { success: true };
  } catch (error) {
    logServerError("insurance", "scheme-create-failed", error);
    return { error: safeServerMessage(error, "We couldn't add the scheme.") };
  }
}

const policySchema = z.object({
  patient_id: z.string().uuid(),
  insurance_scheme_id: z.string().uuid(),
  policy_number: z.string().trim().min(2).max(80),
  member_number: z.string().trim().max(80).optional().or(z.literal("")),
  group_number: z.string().trim().max(80).optional().or(z.literal("")),
  coverage_percent: z.coerce.number().min(0).max(100).optional().or(z.literal("")),
  valid_from: z.string().optional().or(z.literal("")),
  valid_to: z.string().optional().or(z.literal("")),
});

export async function createPolicyAction(_prev: unknown, formData: FormData) {
  try {
    const input = policySchema.parse(Object.fromEntries(formData));
    await createPatientPolicy({
      patientId: input.patient_id, insuranceSchemeId: input.insurance_scheme_id,
      policyNumber: input.policy_number, memberNumber: input.member_number || null,
      groupNumber: input.group_number || null,
      coveragePercent: input.coverage_percent === "" ? null : input.coverage_percent ?? null,
      validFrom: input.valid_from || null, validTo: input.valid_to || null,
    });
    revalidatePath("/staff/insurance/policies");
    return { success: true };
  } catch (error) {
    logServerError("insurance", "policy-create-failed", error);
    return { error: safeServerMessage(error, "We couldn't add the policy.") };
  }
}
