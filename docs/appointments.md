# Appointment flow

The website collects facility, department, optional service, date/time, patient information, and reason. `appointmentRequestSchema` validates the input. `appointment.service.ts` requires an authenticated user, validates the public hierarchy, resolves or creates the patient by `auth_user_id`, calculates a request window, and inserts `status = requested` with `clinician_user_id = null`.

Patients read only their own appointments through the patient repository and can cancel only `requested`, `scheduled`, or `confirmed` records. Staff reads require `appointment.read`; status updates require `appointment.update` and use the explicit transition map. PostgreSQL RLS and the appointment update trigger remain defense in depth.
