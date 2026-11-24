"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { safeServerMessage } from "@/server/errors";
import { logServerError } from "@/server/logging";
import { approveLabResultAction as approveResult, collectLabSample, createLabOrder, createLabTest, saveLabResult, setLabItemProcessing } from "@/server/services/lab.service";

const orderSchema = z.object({
  encounter_id: z.string().uuid(),
  priority: z.enum(["routine", "urgent", "stat"]).default("routine"),
  clinical_notes: z.string().trim().max(2000).optional().or(z.literal("")),
  test_ids: z.array(z.string().uuid()).min(1).max(50),
});

export async function createLabOrderAction(_prev: unknown, formData: FormData) {
  try {
    const input = orderSchema.parse({
      encounter_id: formData.get("encounter_id"),
      priority: formData.get("priority") || "routine",
      clinical_notes: formData.get("clinical_notes") || "",
      test_ids: formData.getAll("test_ids"),
    });
    const id = await createLabOrder({ encounterId: input.encounter_id, priority: input.priority, clinicalNotes: input.clinical_notes || null, testIds: input.test_ids });
    revalidatePath("/staff/lab");
    return { success: true, orderId: id };
  } catch (error) {
    logServerError("lab", "order-create-failed", error);
    return { error: safeServerMessage(error, "We couldn't create the lab order.") };
  }
}

export async function collectSampleAction(itemId: string, orderId: string) {
  try {
    await collectLabSample(itemId);
    revalidatePath(`/staff/lab/orders/${orderId}`);
    revalidatePath("/staff/lab");
    return { success: true };
  } catch (error) {
    logServerError("lab", "collect-failed", error);
    return { error: safeServerMessage(error, "We couldn't record the sample collection.") };
  }
}

export async function processItemAction(itemId: string, orderId: string) {
  try {
    await setLabItemProcessing(itemId);
    revalidatePath(`/staff/lab/orders/${orderId}`);
    return { success: true };
  } catch (error) {
    logServerError("lab", "process-failed", error);
    return { error: safeServerMessage(error, "We couldn't update the item status.") };
  }
}

const resultSchema = z.object({
  item_id: z.string().uuid(),
  order_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  result_value: z.string().trim().max(200).optional().or(z.literal("")),
  unit: z.string().trim().max(40).optional().or(z.literal("")),
  reference_range: z.string().trim().max(200).optional().or(z.literal("")),
  abnormal_flag: z.enum(["normal", "low", "high", "critical", "abnormal"]).optional().or(z.literal("")),
  result_text: z.string().trim().max(4000).optional().or(z.literal("")),
});

export async function saveLabResultAction(_prev: unknown, formData: FormData) {
  try {
    const input = resultSchema.parse(Object.fromEntries(formData));
    await saveLabResult({
      itemId: input.item_id, orderId: input.order_id, patientId: input.patient_id,
      resultValue: input.result_value || null, unit: input.unit || null,
      referenceRange: input.reference_range || null,
      abnormalFlag: input.abnormal_flag || null, resultText: input.result_text || null,
    });
    revalidatePath(`/staff/lab/orders/${input.order_id}`);
    revalidatePath("/staff/lab");
    return { success: true };
  } catch (error) {
    logServerError("lab", "result-save-failed", error);
    return { error: safeServerMessage(error, "We couldn't save the result.") };
  }
}

export async function approveLabResultServerAction(resultId: string, orderId: string) {
  try {
    await approveResult(resultId, orderId);
    revalidatePath(`/staff/lab/orders/${orderId}`);
    revalidatePath("/staff/lab");
    return { success: true };
  } catch (error) {
    logServerError("lab", "result-approve-failed", error);
    return { error: safeServerMessage(error, "We couldn't approve the result.") };
  }
}

const testSchema = z.object({
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  specimen_type: z.string().trim().max(80).optional().or(z.literal("")),
  default_unit: z.string().trim().max(40).optional().or(z.literal("")),
  reference_range_text: z.string().trim().max(200).optional().or(z.literal("")),
  price: z.coerce.number().min(0).max(999999999),
  department_id: z.string().uuid().optional().or(z.literal("")),
});

export async function createLabTestAction(_prev: unknown, formData: FormData) {
  try {
    const input = testSchema.parse(Object.fromEntries(formData));
    await createLabTest({
      code: input.code, name: input.name, description: input.description || null,
      specimenType: input.specimen_type || null, defaultUnit: input.default_unit || null,
      referenceRangeText: input.reference_range_text || null, price: input.price,
      departmentId: input.department_id || null,
    });
    revalidatePath("/staff/lab/tests");
    return { success: true };
  } catch (error) {
    logServerError("lab", "test-create-failed", error);
    return { error: safeServerMessage(error, "We couldn't add the test.") };
  }
}
