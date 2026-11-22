import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workspaceRoot = path.resolve(__dirname, "../../../../../..");
const read = (relativePath: string) => fs.readFileSync(path.join(workspaceRoot, relativePath), "utf8");

describe("Doctor management correctness contracts", () => {
  it("initializes the portal Doctor from a server-resolved public slug", () => {
    const source = read("apps/web/src/app/portal/appointments/new/page.tsx");
    expect(source).toContain("params.doctor");
    expect(source).toContain("listPublicClinicians");
    expect(source).toContain("initialClinician={initialClinician?.key}");
    expect(source).toContain("is not available for that selection");
  });

  it("uses generated slots in public and portal booking without free-form appointment time", () => {
    const source = read("apps/web/src/features/appointments/components/booking-form.tsx");
    expect(source).toContain("getAvailableAppointmentSlots");
    expect(source).toContain("No appointment times are available on this date");
    expect(source).not.toContain('type="datetime-local"');
  });

  it("revalidates the exact generated slot and delegates the insert to the transactional RPC", () => {
    const service = read("apps/web/src/server/services/appointment.service.ts");
    const repository = read("apps/web/src/server/repositories/appointment.repository.ts");
    expect(service).toContain("resolveGeneratedBookingSlot");
    expect(service).toContain("That appointment time is no longer available");
    expect(repository).toContain('supabase.rpc("request_patient_appointment"');
  });

  it("keeps internal identity columns out of the anonymous clinician return signature", () => {
    const migration = read("supabase/migrations/20261009203008_doctor_management_correctness.sql");
    const signature = migration.match(/create function public\.get_public_clinician_directory\(\)[\s\S]*?language sql/i)?.[0] ?? "";
    expect(signature).not.toMatch(/membership_id|user_id|organization_id/);
    expect(signature).toMatch(/slug text/);
    expect(signature).toMatch(/accepting_appointments boolean/);
  });

  it("uses atomic replacement functions for every destructive collection save", () => {
    const action = read("apps/web/src/server/actions/staff-management.actions.ts");
    const migration = read("supabase/migrations/20261009203008_doctor_management_correctness.sql");
    for (const name of [
      "replace_clinician_availability",
      "replace_clinician_assignments",
      "replace_clinician_profile",
    ]) {
      expect(action).toContain(`supabase.rpc("${name}"`);
      expect(migration).toContain(`function public.${name}`);
    }
    expect(migration).toContain("Availability replacement count mismatch");
    expect(migration).toContain("Department replacement count mismatch");
    expect(migration).toContain("Specialization replacement count mismatch");
  });

  it("uses private photo ownership, opaque keys, RLS and explicit function grants", () => {
    const action = read("apps/web/src/server/actions/staff-management.actions.ts");
    const migration = read("supabase/migrations/20261009203008_doctor_management_correctness.sql");
    expect(action).toContain("opaqueDoctorPhotoObjectPath");
    expect(action).not.toContain("`${actor.membership.organization_id}/${member.id}/");
    expect(migration).toContain("alter table public.clinician_photo_objects enable row level security");
    expect(migration).toContain("revoke all on function private.request_patient_appointment_impl");
    expect(migration).toContain("grant execute on function public.request_patient_appointment");
  });

  it("enforces department opening hours in the authoritative booking RPC", () => {
    const migration = read("supabase/migrations/20261113164152_enforce_department_opening_hours.sql");
    expect(migration).toContain("function private.department_open_at");
    expect(migration).toContain("private.department_open_at(p_department_id, v_local_start, v_local_end)");
    expect(migration).toContain("if v_hours is null or v_hours = '{}'::jsonb then");
    const arraySupport = read("supabase/migrations/20261113165305_department_opening_hours_array_support.sql");
    expect(arraySupport).toContain("jsonb_array_elements_text(v_value)");
    expect(arraySupport).toContain("exception when others then");
  });

  it("validates clinician assignment in the database and keeps one update guard", () => {
    const migration = read("supabase/migrations/20261113164214_appointment_clinician_assignment_integrity.sql");
    expect(migration).toContain("function private.is_assignable_clinician");
    expect(migration).toContain("private.guard_appointment_clinician");
    expect(migration).toContain("drop trigger if exists guard_patient_appointment_update");
  });

  it("carries effective availability windows through the editor and the RPC", () => {
    const migration = read("supabase/migrations/20261113164235_availability_effective_dates_and_grants.sql");
    const editor = read("apps/web/src/features/staff/components/staff-detail-manager.tsx");
    const action = read("apps/web/src/server/actions/staff-management.actions.ts");
    expect(migration).toContain("effective_from date, effective_to date");
    expect(migration).toContain("clinician_availability_rules_unique_window_idx");
    expect(editor).toContain("Window starts");
    expect(action).toContain("effective_from: period.effectiveFrom || null");
  });

  it("generates public slots from department opening hours and carries booking context", () => {
    const service = read("apps/web/src/server/services/public-clinician.service.ts");
    const page = read("apps/web/src/app/(public)/doctors/page.tsx");
    expect(service).toContain("openingHours: openingHoursByDepartment.get(pair.departmentId)");
    expect(service).toContain("departmentId: pair.departmentId");
    expect(page).toContain("publicBookingPath({");
    expect(page).toContain("doctor.nextSlot.timeZone");
  });
});
