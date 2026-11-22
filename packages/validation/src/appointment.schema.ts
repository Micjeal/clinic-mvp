import {z} from "zod";

export const appointmentRequestSchema = z.object({
  facility_id: z.string().uuid(),
  department_id: z.string().uuid(),
  service_id: z.string().uuid().optional().or(z.literal("")),
  clinician_slug: z.string().trim().max(120).optional().or(z.literal("")),
  clinician_user_id: z.string().uuid().optional().or(z.literal("")),
  scheduled_start: z.string().min(10),
  reason: z.string().max(500).optional(),
  first_name: z.string().trim().min(1),
  last_name: z.string().trim().min(1),
  phone: z.string().trim().min(7),
  email: z.string().email(),
});

export type AppointmentRequestInput = z.infer<typeof appointmentRequestSchema>;
