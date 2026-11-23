export type PatientAppointment = {
  id: string;
  status: string;
  scheduledStart: string;
  scheduledEnd: string | null;
  createdAt: string;
  reason: string | null;
  facility: {
    name: string | null;
    addressLine: string | null;
    city: string | null;
    district: string | null;
  };
  departmentName: string | null;
  serviceName: string | null;
  clinicianName?: string | null;
  organizationId?: string;
};

export type PatientAppointmentView = "upcoming" | "past" | "cancelled" | "all";
