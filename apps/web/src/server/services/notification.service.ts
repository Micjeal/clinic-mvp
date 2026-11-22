import "server-only";
import {createAdminClient} from "@/lib/supabase/admin";

export type NotificationType = "appointment_requested" | "appointment_confirmed" | "appointment_cancelled" | "appointment_status_changed" | "password_reset";

export type NotificationInput = {
  type: NotificationType;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export async function sendNotification(input: NotificationInput) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("notifications").insert({
    type: input.type,
    recipient_email: input.recipientEmail,
    recipient_name: input.recipientName || null,
    subject: input.subject,
    message: input.message,
    metadata: input.metadata || {},
    status: "pending",
    created_at: new Date().toISOString(),
  });
  if (error) {
    console.error("Failed to create notification:", error);
    throw error;
  }
}

export async function getNotificationsByEmail(email: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_email", email)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
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
