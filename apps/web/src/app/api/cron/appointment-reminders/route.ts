import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listOrganizationSettingsAdmin } from "@/server/repositories/settings.repository";
import { sendNotification } from "@/server/services/notification.service";
import { formatAppointmentDateTime } from "@/features/appointments/utils/staff-appointments";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron entry point for appointment reminders.
 * Schedule is declared in vercel.json; Vercel sends
 * `Authorization: Bearer $CRON_SECRET` on each invocation.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Cron is not configured." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const settingsRows = (await listOrganizationSettingsAdmin()).filter((row) => row.appointment_reminders_enabled);
  if (!settingsRows.length) return NextResponse.json({ sent: 0, skipped: "no-enabled-organizations" });

  // One query for all reminder notifications sent in the last 7 days — used for dedupe.
  const dedupeSince = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const { data: existing, error: existingError } = await supabase
    .from("notifications")
    .select("recipient_patient_id,metadata")
    .eq("type", "appointment_reminder")
    .gte("created_at", dedupeSince);
  if (existingError) return NextResponse.json({ error: "Failed to load reminder history." }, { status: 500 });
  const sent = new Set(
    (existing ?? [])
      .map((row) => `${row.recipient_patient_id}:${String((row.metadata as Record<string, unknown> | null)?.appointment_id ?? "")}`),
  );

  let created = 0;
  for (const settings of settingsRows) {
    const windowEnd = new Date(now.getTime() + settings.reminder_hours_before * 3_600_000);
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("id,patient_id,scheduled_start,organization_id,facilities!appointments_facility_id_fkey(name,timezone),departments!appointments_department_id_fkey(name),services!appointments_service_id_fkey(name),patients!appointments_patient_id_fkey(first_name,last_name,email)")
      .eq("organization_id", settings.organization_id)
      .in("status", ["requested", "scheduled", "confirmed"])
      .gt("scheduled_start", now.toISOString())
      .lte("scheduled_start", windowEnd.toISOString())
      .limit(200);
    if (error) continue;

    for (const appointment of appointments ?? []) {
      const key = `${appointment.patient_id}:${appointment.id}`;
      if (sent.has(key)) continue;
      const one = <T,>(value: unknown): T | null => (Array.isArray(value) ? ((value[0] as T) ?? null) : (value as T | null));
      const facility = one<{ name?: string; timezone?: string }>(appointment.facilities);
      const department = one<{ name?: string }>(appointment.departments);
      const service = one<{ name?: string }>(appointment.services);
      const patient = one<{ first_name?: string; last_name?: string; email?: string | null }>(appointment.patients);
      const patientName = [patient?.first_name, patient?.last_name].filter(Boolean).join(" ") || undefined;
      const when = formatAppointmentDateTime(
        appointment.scheduled_start,
        (facility as { timezone?: string } | null)?.timezone ?? "Africa/Kampala",
      );
      const what = (service as { name?: string } | null)?.name ?? (department as { name?: string } | null)?.name ?? "your appointment";
      try {
        await sendNotification({
          type: "appointment_reminder",
          recipientPatientId: appointment.patient_id,
          recipientEmail: patient?.email ?? null,
          recipientName: patientName,
          subject: "Appointment reminder",
          message: `Reminder: your appointment for ${what}${facility ? ` at ${facility.name}` : ""} is on ${when}.`,
          channel: "in_app",
          metadata: { appointment_id: appointment.id, reminder_hours_before: settings.reminder_hours_before },
        });
        await sendNotification({
          type: "appointment_reminder",
          recipientPatientId: appointment.patient_id,
          recipientName: patientName,
          subject: "Appointment reminder",
          message: `Reminder: your appointment for ${what}${facility ? ` at ${facility.name}` : ""} is on ${when}.`,
          channel: "sms",
          metadata: { appointment_id: appointment.id, reminder_hours_before: settings.reminder_hours_before },
        });
        sent.add(key);
        created += 1;
      } catch {
        // Individual failures are logged by sendNotification callers upstream; continue the batch.
      }
    }
  }

  return NextResponse.json({ sent: created, organizations: settingsRows.length });
}
