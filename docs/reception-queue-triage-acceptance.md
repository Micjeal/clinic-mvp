# Reception, Queue and Triage acceptance

The application-side Phase 2 workflow is:

`confirmed appointment → check-in → encounter → queue → triage → waiting_clinician`

Walk-ins use an existing or newly registered patient and create an open encounter with a nullable `appointment_id`.

## Live database acceptance

1. Confirm migration `20261008100000_reception_queue_triage` is applied.
2. Inspect `queue_entries`, `encounters.service_id`, RLS, policies, indexes and the appointment uniqueness index.
3. Run Supabase Security Advisor and review new findings.
4. Check in a confirmed appointment twice; confirm one encounter and one queue entry.
5. Create an existing-patient and new-patient walk-in.
6. Start triage, record vitals, set a manual priority, and complete triage.
7. Test receptionist, nurse, administrator, doctor and patient permissions.
8. Attempt cross-organization queue, encounter and vitals reads/writes.
9. Verify suspended staff cannot use protected staff routes.

The queue priority is staff-selected; vital signs never automatically classify urgency. The database migration is applied to the connected project, but controlled authenticated account acceptance remains a separate runtime check.
