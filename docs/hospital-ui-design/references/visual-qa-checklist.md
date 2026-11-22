# Hospital UI Visual QA Checklist

Use this before calling a healthcare redesign complete.

## Hierarchy
- [ ] Can the user identify the page purpose within 3 seconds?
- [ ] Is the primary action obvious?
- [ ] Are related data grouped?
- [ ] Is there unnecessary empty space?
- [ ] Is there duplicated status/context?

## Controls
- [ ] No browser-native multi-select is used as a primary enterprise workflow control unless clearly justified.
- [ ] Primary/secondary/destructive actions are visually distinct.
- [ ] Save actions are close to the edited content.
- [ ] Dirty state is visible when relevant.
- [ ] Validation appears near the affected control.

## Healthcare credibility
- [ ] No fake clinical metrics.
- [ ] No fake doctors.
- [ ] No fake schedules.
- [ ] No fabricated contact/pricing/reviews.
- [ ] Urgent/destructive red is used sparingly.

## Forms
- [ ] Labels are visible.
- [ ] Controls are at least ~44px on touch devices.
- [ ] Form width is constrained.
- [ ] Required/optional state is clear.
- [ ] Units are shown for clinical measurements.

## Responsive
- [ ] 320px works without horizontal overflow.
- [ ] 375–430px has usable touch targets.
- [ ] Tablet does not squeeze two-column layouts.
- [ ] Desktop does not create giant blank spaces.
- [ ] Wide screens retain sensible content max-width.

## Navigation
- [ ] Current section is obvious.
- [ ] Mobile navigation is appropriate to the surface.
- [ ] Doctor editor does not revert to generic top tabs when a configuration rail is more useful.

## Accessibility
- [ ] Keyboard focus visible.
- [ ] Status not color-only.
- [ ] Dialogs manage focus.
- [ ] Navigation uses semantic labels/aria-current.
- [ ] Inputs have labels.
- [ ] Contrast is sufficient.

## Data and architecture
- [ ] UI uses real supported data.
- [ ] Optional missing data produces an intentional empty state.
- [ ] No UI redesign weakens authorization/RLS.
- [ ] No internal UUIDs are shown.
- [ ] Public views do not leak private staff fields.

## Final visual test
Review representative screens at:
- 320
- 375
- 430
- 768
- 1024
- 1366
- 1440
- 1920
