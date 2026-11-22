# Doctor availability investigation

Initial diagnostic for membership `8a1c14b1-a9e6-4c3b-b654-76c44ee2c518` (Peter), captured before implementation changes.

- Admin save result: the Availability editor submits `membership_id`, `facility_id`, and `periods_json`; `saveAvailabilityAction` parses `dayOfWeek`, `startTime`, and `endTime`, validates the intervals, then replaces rules for the selected membership/facility.
- Database rule result: the live database contains three active rows for Peter under membership `8a1c14b1-a9e6-4c3b-b654-76c44ee2c518` and facility `22222222-2222-4222-8222-222222222222`, with `day_of_week` values `0`, `2`, and `4`, each `08:00:00`–`12:00:00`.
- Public eligibility result: Peter is active, assigned to Pediatrics, has one active public 30-minute service, and has a public profile, but `accepting_appointments` is currently `false`; public slot generation intentionally returns no next slot while booking is paused.
- SchedulingService result: the canonical weekday representation is PostgreSQL/JavaScript `0`–`6` (Sunday through Saturday), and facility-local recurring times are converted with the facility timezone before slots are generated.
- Root cause status: the reported public-visibility symptom is currently explained by Peter’s booking flag being paused, not by a missing availability row. Remaining investigation is focused on proving the Admin refresh path and all date/weekday consumers agree before changing code.

