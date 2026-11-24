"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { safeServerMessage } from "@/server/errors";
import { logServerError } from "@/server/logging";
import { approveImagingReport, createImagingOrder, createImagingTest, saveImagingReport, setImagingStatus } from "@/server/services/radiology.service";

const orderSchema = z.object({
  encounter_id: z.string().uuid(),
  imaging_test_id: z.string().uuid(),
  priority: z.enum(["routine", "urgent", "stat"]).default("routine"),
  clinical_indication: z.string().trim().max(2000).optional().or(z.literal("")),
  scheduled_at: z.string().optional().or(z.literal("")),
});

export async function createImagingOrderAction(_prev: unknown, formData: FormData) {
  try {
    const input = orderSchema.parse(Object.fromEntries(formData));
    const id = await createImagingOrder({ encounterId: input.encounter_id, imagingTestId: input.imaging_test_id, priority: input.priority, clinicalIndication: input.clinical_indication || null, scheduledAt: input.scheduled_at || null });
    revalidatePath("/staff/radiology");
    return { success: true, orderId: id };
  } catch (error) {
    logServerError("radiology", "order-create-failed", error);
    return { error: safeServerMessage(error, "We couldn't create the imaging order.") };
  }
}

export async function setImagingStatusAction(orderId: string, status: string) {
  try {
    await setImagingStatus(orderId, status);
    revalidatePath("/staff/radiology");
    revalidatePath(`/staff/radiology/orders/${orderId}`);
    return { success: true };
  } catch (error) {
    logServerError("radiology", "status-failed", error);
    return { error: safeServerMessage(error, "We couldn't update the order.") };
  }
}

const reportSchema = z.object({
  order_id: z.string().uuid(),
  findings: z.string().trim().max(20000).optional().or(z.literal("")),
  impression: z.string().trim().max(20000).optional().or(z.literal("")),
  recommendations: z.string().trim().max(20000).optional().or(z.literal("")),
});

export async function saveImagingReportAction(_prev: unknown, formData: FormData) {
  try {
    const input = reportSchema.parse(Object.fromEntries(formData));
    await saveImagingReport({ orderId: input.order_id, findings: input.findings || null, impression: input.impression || null, recommendations: input.recommendations || null });
    revalidatePath(`/staff/radiology/orders/${input.order_id}`);
    revalidatePath("/staff/radiology");
    return { success: true };
  } catch (error) {
    logServerError("radiology", "report-save-failed", error);
    return { error: safeServerMessage(error, "We couldn't save the report.") };
  }
}

export async function approveImagingReportAction(orderId: string) {
  try {
    await approveImagingReport(orderId);
    revalidatePath(`/staff/radiology/orders/${orderId}`);
    revalidatePath("/staff/radiology");
    return { success: true };
  } catch (error) {
    logServerError("radiology", "report-approve-failed", error);
    return { error: safeServerMessage(error, "We couldn't approve the report.") };
  }
}

const testSchema = z.object({
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2).max(160),
  modality: z.enum(["xray", "ultrasound", "ct", "mri", "mammography", "fluoroscopy", "other"]),
  body_part: z.string().trim().max(80).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  price: z.coerce.number().min(0).max(999999999),
});

export async function createImagingTestAction(_prev: unknown, formData: FormData) {
  try {
    const input = testSchema.parse(Object.fromEntries(formData));
    await createImagingTest({ code: input.code, name: input.name, modality: input.modality, bodyPart: input.body_part || null, description: input.description || null, price: input.price });
    revalidatePath("/staff/radiology/tests");
    return { success: true };
  } catch (error) {
    logServerError("radiology", "test-create-failed", error);
    return { error: safeServerMessage(error, "We couldn't add the exam.") };
  }
}
