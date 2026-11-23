import {describe,expect,it} from "vitest";
import type {StaffAppointment} from "../types/staff-appointment.types";
import {filterStaffAppointments} from "./staff-appointments";
import {buildStaffDashboard} from "../../staff/utils/staff-dashboard";

function appointment(overrides:Partial<StaffAppointment>={}):StaffAppointment{return {id:"appointment-1",status:"requested",scheduledStart:"2026-10-07T07:30:00.000Z",scheduledEnd:"2026-10-07T08:00:00.000Z",createdAt:"2026-10-06T10:00:00.000Z",updatedAt:"2026-10-06T10:00:00.000Z",reason:null,patient:{id:"pat-1",name:"Amina N.",number:"PT-2026-100001",phone:null,email:null},facility:{id:"facility-1",name:"Main Clinic"},department:{id:"department-1",name:"General Medicine"},service:{id:"service-1",name:"General Consultation"},createdByLabel:"Patient self-service",...overrides};}

describe("staff dashboard aggregation",()=>{
  it("returns zero-safe groups for an empty organization",()=>{const dashboard=buildStaffDashboard([],{now:new Date("2026-10-07T08:00:00.000Z"),timeZone:"Africa/Kampala"});expect(dashboard.metrics.every(metric=>metric.value===0)).toBe(true);expect(dashboard.attention).toEqual([]);expect(dashboard.today).toEqual([]);expect(dashboard.recent).toEqual([]);});
  it("groups live appointment records by status and Kampala day",()=>{const completed=appointment({id:"appointment-2",status:"completed",updatedAt:"2026-10-07T09:00:00.000Z"});const dashboard=buildStaffDashboard([appointment(),completed],{now:new Date("2026-10-07T08:00:00.000Z"),timeZone:"Africa/Kampala"});expect(dashboard.metrics.find(metric=>metric.label==="Today's appointments")?.value).toBe(2);expect(dashboard.metrics.find(metric=>metric.label==="New requests")?.value).toBe(1);expect(dashboard.metrics.find(metric=>metric.label==="Completed today")?.value).toBe(1);expect(dashboard.attention.map(item=>item.id)).toEqual(["appointment-1"]);});
});

describe("organization-scoped appointment presentation filters",()=>{
  const items=[appointment(),appointment({id:"appointment-2",status:"confirmed",patient:{id:"pat-2",name:"John Okello",number:"PT-2026-100002",phone:null,email:null},department:{id:"department-2",name:"Paediatrics"},service:null})];
  it("searches only the already scoped result set by patient name or number",()=>{expect(filterStaffAppointments(items,{search:"100002"},"Africa/Kampala").map(item=>item.id)).toEqual(["appointment-2"]);expect(filterStaffAppointments(items,{search:"amina"},"Africa/Kampala").map(item=>item.id)).toEqual(["appointment-1"]);});
  it("combines status and department filters",()=>{expect(filterStaffAppointments(items,{status:"confirmed",department:"department-2"},"Africa/Kampala").map(item=>item.id)).toEqual(["appointment-2"]);expect(filterStaffAppointments(items,{status:"requested",department:"department-2"},"Africa/Kampala")).toEqual([]);});
});
