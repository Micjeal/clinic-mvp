# Clinician scheduling acceptance checklist

The clinician scheduling migration has now been applied to the connected Supabase project through the connected migration tool. The local Supabase CLI remains blocked by the Windows telemetry file permission error at `C:\Users\mickn\.supabase\telemetry.json.tmp`.

Remaining live acceptance:

1. Create the first real Doctor from `/staff/users` → **Add staff** → **Doctor**.
2. Configure facility, department/service assignments, public profile and weekly periods.
3. Verify public and portal doctor discovery only returns eligible configured doctors.
4. Verify generated slots use the selected service duration, exceptions and existing reserving appointments.
5. Attempt two overlapping bookings for one clinician and confirm the database constraint allows only one.
6. Confirm cancelled/no-show appointments release future slots.
7. Verify cross-organization reads and writes are rejected.
8. Test staff clinician assignment and reassignment at an occupied and free time.
9. Test staff suspension prevents staff access.

Live checks completed: all four scheduling tables exist with RLS enabled, expected indexes and policies exist, the scheduled-end check and clinician overlap exclusion constraint exist, and migration history contains `staff_clinician_scheduling` and `allow_authorized_clinician_assignment`. Security Advisor now reports only the pre-existing leaked-password-protection warning; `btree_gist` was moved out of `public`.

## Deferred live Supabase acceptance sequence

1. Fix Supabase tooling/access.
2. Apply the clinician scheduling migrations.
3. Inspect tables, triggers, policies and constraints.
4. Run Security Advisor and resolve new findings.
5. Create the first real Doctor.
6. Assign departments and services.
7. Configure the public clinician profile.
8. Configure weekly availability and add a time-off exception.
9. Test public discovery and patient portal booking.
10. Test staff assignment/reassignment.
11. Attempt concurrent double booking.
12. Test cross-organization access and suspension.

## Current scheduling behavior

- Availability uses a configurable 15-minute grid (`SCHEDULING_GRID_MINUTES`) while each service controls the appointment duration.
- `Any available doctor` aggregates slots from eligible clinicians and leaves `clinician_user_id` null on the request.
- A specifically selected doctor is revalidated server-side before appointment creation.
- Availability precedence is deterministic: base weekly periods are combined with available overrides, unavailable exceptions remove time even if an override overlaps, and active appointments are removed last.
- The authored exclusion constraint protects active clinician reservations, but its live enforcement is not yet verified.
