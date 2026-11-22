# Doctor Editor Pattern

Use this reference whenever redesigning a doctor-management workspace.

## The weak pattern

Avoid:

```text
[large vertical nav]
[large setup card]
[large website card]

Departments                     Bookable Services

[raw multi-select]              [one huge bordered box]


                                               Save
```

Problems:
- native multi-select looks unfinished;
- primary department is implicit;
- department and service controls are visually disconnected;
- excessive blank space;
- oversized containers make sparse data look broken;
- save action is remote from the edited controls;
- weak relationship between department selection and service eligibility;
- no useful preview of the resulting doctor configuration.

## Preferred pattern

```text
Doctor identity header
Dr. Peter
Pediatrician
Pediatrics • Main Facility
Active • Website hidden • Bookings paused

┌─────────────────────┬──────────────────────────────────────────┐
│ Summary             │ Clinical Setup                           │
│ Clinical Setup      │                                          │
│ Public Profile      │ Departments                              │
│ Availability        │ Pediatrics                 PRIMARY       │
│ Time Off            │ [Make primary] [Remove]                  │
│                     │                                          │
│ Setup 3/6           │ [+ Assign department]                    │
│ Website hidden      │                                          │
│ Bookings paused     │ Bookable Services                        │
│                     │ Pediatrics                               │
│                     │ [ ] Pediatric Consultation               │
│                     │                                          │
│                     │ Unsaved changes                          │
│                     │                    [Discard] [Save]       │
└─────────────────────┴──────────────────────────────────────────┘
```

## Department interaction

Prefer assigned department rows/cards.

Each should make visible:
- name;
- primary status;
- optional facility context;
- remove action;
- make-primary action when not primary.

For many departments, use an Add Department dialog with search and checkboxes.

Do not use "the first selected department is primary" as the only UX rule.

## Service interaction

Services are downstream of department selection.

Group by assigned department.

Each service row:
- checkbox;
- service name;
- optional duration;
- no unnecessary card nesting.

If no service exists:
- show an intentional empty state;
- do not render a large empty bordered rectangle.

## Save behavior

Show dirty state.

Save should be close to the working area, ideally in a sticky/local footer.

After save:
- show explicit success feedback;
- reload fresh server state;
- update setup progress.

## Setup progress

Progress should be supportive, not dominant.

Keep it compact:
- Account
- Facility
- Department
- Services
- Public profile
- Availability

A separate large "Doctor Setup" card is unnecessary if the rail already communicates completion clearly.

## Website status

Show concise status in the rail/header.

Do not use a second oversized panel unless it contains actionable content.

## Density

Clinical setup is an operational form. Use a tighter layout than a marketing page.

Large empty white space is not "premium" when the task is simple.
