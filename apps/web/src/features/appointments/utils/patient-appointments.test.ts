import {describe,expect,it} from "vitest";
import type {PatientAppointment} from "@/types/patient-portal";
import {filterPatientAppointments,findUpcomingAppointment,patientAppointmentView} from "./patient-appointments";

function appointment(id:string,status:string,scheduledStart:string):PatientAppointment{return {id,status,scheduledStart,scheduledEnd:null,createdAt:"2026-10-01T08:00:00.000Z",reason:null,facility:{name:"Clinic",addressLine:null,city:null,district:null},departmentName:"General",serviceName:null};}

describe("patient appointment views",()=>{
  const now=new Date("2026-10-07T08:00:00.000Z").getTime();
  const rows=[appointment("future","scheduled","2026-10-10T08:00:00.000Z"),appointment("past","requested","2026-10-01T08:00:00.000Z"),appointment("cancelled","cancelled","2026-10-12T08:00:00.000Z"),appointment("active","checked_in","2026-10-07T07:00:00.000Z")];
  it("groups cancelled, past, future and active visits",()=>{expect(patientAppointmentView(rows[0],now)).toBe("upcoming");expect(patientAppointmentView(rows[1],now)).toBe("past");expect(patientAppointmentView(rows[2],now)).toBe("cancelled");expect(patientAppointmentView(rows[3],now)).toBe("upcoming");});
  it("filters views and finds the next visit",()=>{expect(filterPatientAppointments(rows,"cancelled",now).map(row=>row.id)).toEqual(["cancelled"]);expect(findUpcomingAppointment(rows,now)?.id).toBe("active");});
});
