---
name: hospital-ui-design
description: Design, review, and refine hospital, clinic, healthcare admin, doctor-management, patient-portal, appointment, reception, queue, and triage interfaces. Use this skill whenever a healthcare UI looks generic, cluttered, weak, inconsistent, overly SaaS-like, or needs a professional clinical information hierarchy based on strong healthcare dashboard patterns.
---

# Hospital UI Design

Use this skill for healthcare product design work: public hospital websites, patient portals, staff consoles, doctor management, scheduling, reception, queue, triage, and appointment flows.

The goal is not merely to make screens "modern." The goal is to make them **clinically credible, fast to scan, easy to operate, accessible, and visually coherent**.

## 1. Start with the surface and user

Before changing UI, classify the screen:

- **Public website**: discovery, trust, services, doctors, facilities, booking entry.
- **Patient portal**: calm, personal, low-density, appointment-focused.
- **Staff portal**: compact, operational, high-signal, fast.
- **Doctor management**: profile-centric configuration workspace.
- **Reception**: arrivals, check-in, walk-ins.
- **Queue**: live stage/priority visibility.
- **Triage**: assessment-focused, units visible, no decorative noise.

Do not use one layout pattern for all surfaces.

## 2. Inspect before designing

Always inspect the current screen/code/data model first.

Determine:

- primary task;
- secondary tasks;
- current business rules;
- role/permission constraints;
- dynamic vs static data;
- current responsive behavior;
- existing design tokens/components;
- any visual anti-patterns;
- whether the current control is appropriate for the task.

If a screenshot is available, critique the actual composition, not an imagined version.

## 3. Use references as patterns, never as templates

When web or image search is available, inspect 3–5 high-quality healthcare references before a major redesign.

Use references to study:

- information hierarchy;
- page composition;
- density;
- navigation model;
- doctor/profile treatment;
- schedule presentation;
- filter patterns;
- status presentation;
- responsive behavior.

Never copy proprietary layouts, artwork, branding, or exact component arrangements pixel-for-pixel.

Read `references/healthcare-ui-patterns.md` for the reference patterns used by this skill.

## 4. Clinical visual language

Default visual direction:

- light cool gray / blue-gray page background;
- white primary surfaces;
- deep navy primary text and structure;
- restrained teal/cyan accent;
- red only for urgent, destructive, or clinical criticality;
- soft borders;
- minimal shadow;
- clean iconography;
- compact professional typography.

Avoid:

- neon;
- glassmorphism;
- huge gradients;
- giant SaaS headings;
- overly soft "consumer wellness" visuals in staff tools;
- unnecessary illustrations;
- excessive rounded pills;
- decorative charts with no operational value;
- emoji in production UI.

## 5. Hierarchy before cosmetics

Before changing colors, answer:

1. What must the user understand in 3 seconds?
2. What action is most important?
3. What information belongs together?
4. What can be hidden until needed?
5. What should remain visible while scrolling?
6. What state must never be ambiguous?

Then design the page around those answers.

## 6. Main content composition

Use a repeatable operational hierarchy:

```text
Identity / page header
Context / status
Filters or section navigation
Primary work area
Secondary contextual information
Save / workflow actions
```

Do not fill the page with unrelated cards.

Use whitespace to create hierarchy, not emptiness.

### Good spacing
Prefer a consistent rhythm such as:

- 4
- 8
- 12
- 16
- 20
- 24
- 32
- 40

Avoid arbitrary spacing values everywhere.

## 7. Doctor management pattern

Doctor management should be **profile-centric**, not a collection of disconnected forms.

Preferred desktop composition:

```text
Doctor identity header

┌──────────────────────┬────────────────────────────────────────┐
│ Configuration rail   │ Active workspace                       │
│                      │                                        │
│ Summary              │ Focused content                        │
│ Clinical Setup       │                                        │
│ Public Profile       │                                        │
│ Availability         │                                        │
│ Time Off             │                                        │
│                      │                                        │
│ Setup progress       │                                        │
│ Website status       │                                        │
└──────────────────────┴────────────────────────────────────────┘
```

Use the doctor header to answer:

- Who is this doctor?
- What is their professional title?
- What department/facility are they attached to?
- Are they active?
- Are they published?
- Are bookings open?

Do not expose internal UUIDs.

Read `references/doctor-editor-pattern.md` before redesigning doctor administration.

## 8. Never use browser-native multi-select as the main department editor

Avoid large `<select multiple>` controls for doctor departments. They look unfinished, are harder to scan, and make primary assignment ambiguous.

Use one of these patterns instead:

### Pattern A — Assigned department cards + add control
Best when doctors usually belong to 1–3 departments.

```text
Departments

Pediatrics                        PRIMARY
Clinical care for children
[Make primary] [Remove]

[+ Assign department]
```

### Pattern B — Searchable checkbox list
Best when many departments exist.

```text
Search departments...

[x] Pediatrics                  Primary
[ ] General Medicine
[ ] Women's Health
[ ] Dental Care
```

Primary status must be explicit and changeable.

Never rely on "first selected department becomes primary" as the only visible rule.

## 9. Clinical Setup composition

Do not split the page into two giant empty columns simply because there are two data types.

A better hierarchy is:

```text
Clinical Setup

Departments
[assigned rows/cards]

Bookable services
[grouped by assigned department]

Save bar
```

If there is only one assigned department, the services area should not consume half the page as an empty box.

Use content-driven width.

### Services
Group services under their department.

```text
Pediatrics
[x] Pediatric Consultation
[ ] Pediatric Follow-up
```

Use comfortable checkbox rows with labels and optional duration.

## 10. Public profile editing

Prefer a 60/40 desktop split:

```text
Profile form                Live website preview
```

Form fields may include only supported data:

- display name;
- professional title;
- biography;
- photo/avatar.

Keep publication controls separate from draft profile editing.

### Publication
Use two explicit controls:

- Show on website
- Accept online appointments

Display prerequisites before the user clicks save.

Never make profile editing fail just because publication is incomplete.

## 11. Availability design

Avoid seven oversized day cards.

Use a compact weekly schedule:

```text
MONDAY
08:00 – 12:00    Remove
14:00 – 17:00    Remove
+ Add hours

TUESDAY
Unavailable
+ Add hours
```

Support:

- multiple periods;
- facility context;
- copy hours;
- dirty-state save bar;
- validation near the affected row.

Existing appointments must not be silently cancelled by schedule edits.

## 12. Time off

Use a concise list/table:

```text
Date          Time          Type          Action
12 Oct        All day       Unavailable   Remove
18 Oct        09:00–13:00   Unavailable   Remove
```

Use a drawer/modal for adding an exception.

Private notes remain staff-only.

## 13. Staff portal density

Staff interfaces should be more compact than patient/public surfaces.

Use:

- 24–30px page titles;
- 14–15px body text;
- compact cards;
- operational tables;
- mobile cards instead of squeezed tables;
- status badges with text;
- clear right-aligned row actions.

Avoid huge blank panels.

## 14. Patient portal density

Patient portals should feel calmer and simpler.

Prefer:

- appointment cards;
- wider spacing;
- fewer filters;
- clear next appointment;
- prominent booking action;
- plain-language labels;
- low cognitive load.

Do not reuse dense staff table components just for code reuse.

## 15. Public hospital website

Public pages should communicate trust and care.

Prioritize:

- facility identity;
- departments;
- services;
- doctors;
- appointment CTA;
- patient guidance;
- contact/facility information.

Doctor cards should prioritize:

- photo/avatar;
- name;
- professional title;
- department/specialty;
- facility;
- next availability;
- View Profile / Book Appointment.

Do not invent reviews, ratings, patient counts, awards, or doctor experience.

## 16. Status and urgency

Always pair color with text.

Examples:

- Active
- Hidden
- Published
- Paused
- Requested
- Confirmed
- Waiting for triage
- Ready for clinician
- Routine
- Urgent
- Emergency

Reserve red for genuine urgency/destructive states.

## 17. Forms

Use:

- labels above inputs;
- minimum ~44px control height;
- visible focus;
- concise helper text;
- inline validation near the relevant field;
- clear save/discard actions.

Avoid:

- placeholder-only labels;
- full-width 1500px text fields;
- giant blank form containers;
- ambiguous "Save" buttons far from the edited content.

## 18. Save behavior

For long configuration screens, use a local/sticky action bar when changes are dirty.

Example:

```text
Unsaved changes

Discard                     Save clinical setup
```

Success feedback must be explicit:

- Clinical setup updated
- Profile saved
- Schedule updated
- Time off added

Do not rely on a silent refresh.

## 19. Empty states

Empty state format:

- small icon;
- concise title;
- one sentence;
- relevant action.

Example:

```text
No services assigned

Assign at least one service before allowing online bookings.

Assign services
```

No oversized illustration.

## 20. Responsive behavior

At 320–430px:

- replace desktop rail with compact section selector;
- stack forms;
- convert tables to cards;
- keep touch targets >= 44px;
- avoid horizontal overflow;
- keep the primary action reachable.

At 768–1024px:

- collapse secondary side panels before cramping the primary workspace.

At 1280+:

- use width intelligently;
- do not stretch forms;
- preserve a readable maximum content width.

## 21. Accessibility

Always check:

- semantic headings;
- explicit labels;
- keyboard navigation;
- focus-visible styles;
- accessible tabs/navigation;
- `aria-current` / `aria-selected` where appropriate;
- dialog focus management;
- status text in addition to color;
- sufficient contrast;
- meaningful button names.

## 22. Healthcare safety and trust

Never fabricate clinical or operational data to make a screen look better.

Do not invent:

- doctors;
- schedules;
- patient counts;
- ratings;
- experience;
- diagnoses;
- urgency classifications;
- clinic contact information;
- awards;
- prices.

Use real data or intentional empty states.

Do not create automatic triage decisions unless explicitly required and clinically validated.

## 23. Architecture guardrail

UI redesign must not silently change:

- RLS;
- organization scoping;
- permissions;
- appointment transitions;
- scheduling eligibility;
- triage workflow;
- queue workflow;
- data privacy.

Preserve the existing domain architecture unless the task explicitly asks for logic changes.

## 24. Implementation workflow

For every hospital UI redesign:

1. Inspect the current screen and code.
2. Identify visual and interaction failures.
3. Classify the page surface.
4. Review relevant reference patterns if available.
5. Sketch the information hierarchy in text.
6. Reuse existing components/tokens where appropriate.
7. Replace weak native controls with intentional UI patterns.
8. Implement desktop structure.
9. Implement mobile behavior.
10. Verify real data states and empty states.
11. Verify accessibility.
12. Run project quality gates.
13. Report what changed and what remains.

## 25. Visual QA

Before finishing, read `references/visual-qa-checklist.md`.

A redesign is not complete merely because it compiles.

The final result must be visually coherent at representative mobile, tablet, laptop, and large desktop widths.

## 26. Output expectation

When asked for a redesign plan, provide:

- diagnosed problems;
- chosen information architecture;
- component/layout changes;
- responsive behavior;
- accessibility considerations;
- data/business-rule preservation;
- acceptance criteria.

When asked to implement, perform the work and report:

- screens changed;
- shared components changed;
- responsive states;
- real-data states verified;
- tests/quality gates;
- remaining visual acceptance items.
