export type StaffAppointment = {
  id: string;
  status: string;
  scheduledStart: string;
  scheduledEnd: string | null;
  createdAt: string;
  updatedAt: string;
  reason: string | null;
  patient: {
    name: string;
    number: string;
    phone: string | null;
    email: string | null;
  };
  facility: { id: string; name: string; timezone?: string };
  department: { id: string; name: string; openingHours?: unknown };
  service: { id: string; name: string } | null;
  clinician?: { name: string; title: string | null } | null;
  clinicianUserId?: string | null;
  createdByLabel: string;
};

export type AppointmentFilters = {
  search?: string;
  date?: string;
  dateTo?: string;
  status?: string;
  facility?: string;
  department?: string;
  service?: string;
  doctor?: string;
};
