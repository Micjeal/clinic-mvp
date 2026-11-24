import "server-only";
import {createAdminClient} from "@/lib/supabase/admin";
import {findOrganizationSettingsAdmin, DEFAULT_ORGANIZATION_SETTINGS} from "@/server/repositories/settings.repository";
import type {Json} from "@clinic/database";

export type NotificationType = "appointment_requested" | "appointment_confirmed" | "appointment_cancelled" | "appointment_status_changed" | "appointment_clinician_assigned" | "appointment_reminder" | "password_reset";
export type NotificationChannel = "in_app" | "email" | "sms";

export type NotificationInput = {
  type: NotificationType;
  recipientPatientId?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
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

async function notificationAllowedForPatient(patientId: string | null | undefined, channel: NotificationChannel) {
  if (!patientId) return true;
  try {
    const supabase = createAdminClient();
    const { data: patient } = await supabase.from("patients").select("organization_id,phone").eq("id", patientId).maybeSingle();
    if (!patient?.organization_id) return true;
    const settings = { ...DEFAULT_ORGANIZATION_SETTINGS, ...(await findOrganizationSettingsAdmin(patient.organization_id) ?? {}) };
    if (channel === "in_app") return settings.in_app_notifications_enabled;
    if (channel === "sms") return settings.sms_notifications_enabled;
    return settings.email_notifications_enabled;
  } catch {
    return true;
  }
}

function smsProviderConfigured() {
  const provider = process.env.SMS_PROVIDER?.trim().toLowerCase();
  if (provider === "africastalking") return Boolean(process.env.SMS_API_KEY && process.env.SMS_USERNAME);
  if (provider === "twilio") return Boolean(process.env.SMS_ACCOUNT_SID && process.env.SMS_AUTH_TOKEN && process.env.SMS_SENDER_ID);
  return false;
}

async function sendSms(phone: string, message: string): Promise<void> {
  const provider = process.env.SMS_PROVIDER?.trim().toLowerCase();
  if (provider === "africastalking") {
    const body = new URLSearchParams({ username: process.env.SMS_USERNAME!, to: phone, message });
    const sender = process.env.SMS_SENDER_ID?.trim();
    if (sender) body.set("from", sender);
    const response = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: { apiKey: process.env.SMS_API_KEY!, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body,
    });
    if (!response.ok) throw new Error(`Africa's Talking SMS failed: ${response.status}`);
    return;
  }
  if (provider === "twilio") {
    const sid = process.env.SMS_ACCOUNT_SID!;
    const auth = Buffer.from(`${sid}:${process.env.SMS_AUTH_TOKEN}`).toString("base64");
    const body = new URLSearchParams({ To: phone, From: process.env.SMS_SENDER_ID!, Body: message });
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) throw new Error(`Twilio SMS failed: ${response.status}`);
    return;
  }
  throw new Error("No SMS provider configured");
}

async function resolveRecipientPhone(input: NotificationInput): Promise<string | null> {
  if (input.recipientPhone) return input.recipientPhone;
  if (!input.recipientPatientId) return null;
  const supabase = createAdminClient();
  const { data } = await supabase.from("patients").select("phone").eq("id", input.recipientPatientId).maybeSingle();
  return (data?.phone as string | null) ?? null;
}

export async function sendNotification(input: NotificationInput) {
  const supabase = createAdminClient();
  const channel = input.channel ?? "in_app";
  if (!(await notificationAllowedForPatient(input.recipientPatientId, channel))) return;
  if (channel === "sms") {
    if (!smsProviderConfigured()) return;
    const phone = await resolveRecipientPhone(input);
    if (!phone) return;
    const now = new Date().toISOString();
    const { data: row, error } = await supabase.from("notifications").insert({
      type: input.type,
      recipient_patient_id: input.recipientPatientId ?? null,
      recipient_email: input.recipientEmail ?? null,
      recipient_phone: phone,
      recipient_name: input.recipientName || null,
      subject: input.subject,
      message: input.message,
      channel,
      metadata: (input.metadata || {}) as Json,
      status: "pending",
      created_at: now,
    }).select("id").single();
    if (error) { console.error("Failed to create SMS notification:", error); throw error; }
    try {
      await sendSms(phone, `${input.subject}: ${input.message}`.slice(0, 1600));
      await markNotificationSent(row.id);
    } catch (smsError) {
      await markNotificationFailed(row.id, smsError instanceof Error ? smsError.message : "SMS send failed");
    }
    return;
  }
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
