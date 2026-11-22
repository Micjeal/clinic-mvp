import {describe,expect,it} from "vitest";
import {allowedStatusTransitions,appointmentStatusLabel,appointmentTransitionLabel,canTransition,isFutureAppointmentDate,isPatientCancellationStatus} from "@clinic/shared";
import {safeNextPath} from "../../../lib/safe-next-path";

describe("clinic MVP appointment rules",()=>{
  it("allows only future appointment dates",()=>{expect(isFutureAppointmentDate("2030-01-01T10:00:00Z",Date.parse("2029-01-01T00:00:00Z"))).toBe(true);expect(isFutureAppointmentDate("2020-01-01T10:00:00Z",Date.parse("2029-01-01T00:00:00Z"))).toBe(false);expect(isFutureAppointmentDate("not-a-date",0)).toBe(false);});
  it("exposes every documented transition",()=>{expect(allowedStatusTransitions.requested).toEqual(["scheduled","cancelled"]);expect(allowedStatusTransitions.scheduled).toEqual(["confirmed","cancelled","no_show"]);expect(allowedStatusTransitions.confirmed).toEqual(["checked_in","cancelled","no_show"]);expect(allowedStatusTransitions.checked_in).toEqual(["in_progress"]);expect(allowedStatusTransitions.in_progress).toEqual(["completed"]);});
  it("rejects invalid transitions",()=>{expect(canTransition("requested","completed")).toBe(false);expect(canTransition("completed","requested")).toBe(false);expect(canTransition("cancelled","confirmed")).toBe(false);});
  it("limits patient cancellation to eligible statuses",()=>{expect(isPatientCancellationStatus("requested")).toBe(true);expect(isPatientCancellationStatus("scheduled")).toBe(true);expect(isPatientCancellationStatus("confirmed")).toBe(true);expect(isPatientCancellationStatus("completed")).toBe(false);});
  it("rejects unsafe redirect targets",()=>{expect(safeNextPath("/portal","/login")).toBe("/portal");expect(safeNextPath("https://evil.example","/login")).toBe("/login");expect(safeNextPath("//evil.example","/login")).toBe("/login");});
  it("maps statuses and transitions to staff labels",()=>{expect(appointmentStatusLabel("in_progress")).toBe("In progress");expect(appointmentTransitionLabel("checked_in")).toBe("Check in");expect(appointmentTransitionLabel("no_show")).toBe("Mark no-show");});
});
