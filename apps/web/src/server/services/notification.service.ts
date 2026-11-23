import "server-only";
import {createAdminClient} from "@/lib/supabase/admin";
import type {Json} from "@clinic/database";

export type NotificationType = "appointment_requested" | "appointment_confirmed" | "appointment_cancelled" | "appointment_status_changed" | "appointment_clinician_assigned" | "password_reset";
export type NotificationChannel = "in_app" | "email";

export type NotificationInput = {
  type: NotificationType;
  recipientPatientId?: string | null;
  recipientEmail?: string | null;
  recipientName?: string;
  subject: string;
  message: string;
  channel?: NotificationChannel;
  metadata?: Record<string, unknown>;
};

export type PortalNotification = {
  id: string;
  type: string;
  subject: string;
  message: string;
  createdAt: string;
  readAt: string | null;
};

export async function sendNotification(input: NotificationInput) {
  const supabase = createAdminClient();
  const channel = input.channel ?? "in_app";
  const now = new Date().toISOString();
  const { error } = await supabase.from("notifications").insert({
    type: input.type,
    recipient_patient_id: input.recipientPatientId ?? null,
    recipient_email: input.recipientEmail ?? null,
    recipient_name: input.recipientName || null,
    subject: input.subject,
    message: input.message,
    channel,
    metadata: (input.metadata || {}) as Json,
    status: channel === "in_app" ? "sent" : "pending",
    sent_at: channel === "in_app" ? now : null,
    created_at: now,
  });
  if (error) {
    console.error("Failed to create notification:", error);
    throw error;
  }
}

export async function listPortalNotifications(patientId: string, limit = 20): Promise<PortalNotification[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id,type,subject,message,created_at,read_at")
    .eq("recipient_patient_id", patientId)
    .eq("channel", "in_app")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    type: row.type,
    subject: row.subject,
    message: row.message,
    createdAt: row.created_at,
    readAt: row.read_at,
  }));
}

export async function countUnreadPortalNotifications(patientId: string): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_patient_id", patientId)
    .eq("channel", "in_app")
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(id: string, patientId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_patient_id", patientId)
    .is("read_at", null);
  if (error) throw error;
}

export async function markAllNotificationsRead(patientId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_patient_id", patientId)
    .eq("channel", "in_app")
    .is("read_at", null);
  if (error) throw error;
}

export async function markNotificationSent(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("notifications")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function markNotificationFailed(id: string, errorMessage: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("notifications")
    .update({ status: "failed", error_message: errorMessage })
    .eq("id", id);
  if (error) throw error;
}
