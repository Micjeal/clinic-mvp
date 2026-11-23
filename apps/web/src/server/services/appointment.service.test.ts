import {beforeEach,describe,expect,it,vi} from "vitest";

vi.mock("server-only",()=>({}));
vi.mock("@/server/auth/require-user",()=>({requireUser:vi.fn()}));
vi.mock("@/server/auth/require-patient",()=>({requirePatient:vi.fn()}));
vi.mock("@/server/permissions/require-permission",()=>({requirePermission:vi.fn()}));
vi.mock("@/server/repositories/facility.repository",()=>({findPublicFacility:vi.fn()}));
vi.mock("@/server/repositories/department.repository",()=>({findPublicDepartmentForFacility:vi.fn()}));
vi.mock("@/server/repositories/service.repository",()=>({findPublicService:vi.fn()}));
vi.mock("@/server/repositories/scheduling.repository",()=>({listAssignableClinicians:vi.fn(),listClinicianAvailability:vi.fn(),listClinicianBusyIntervals:vi.fn()}));
vi.mock("@/server/repositories/appointment.repository",()=>({createValidatedAppointmentRequest:vi.fn(),listAppointmentsForPatient:vi.fn(),findAppointmentForPatient:vi.fn(),findPatientAppointmentDetails:vi.fn(),cancelPatientAppointment:vi.fn(),listAppointmentsForOrganization:vi.fn(),findAppointmentForOrganization:vi.fn(),updateAppointmentStatus:vi.fn(),updateAppointmentClinician:vi.fn()}));
vi.mock("@/server/services/scheduling.service",()=>({generateSlots:vi.fn(()=>[])}));
vi.mock("@/server/services/booking.service",()=>({resolveGeneratedBookingSlot:vi.fn()}));
vi.mock("@/server/services/patient.service",()=>({resolvePatient:vi.fn()}));
vi.mock("@/server/services/notification.service",()=>({sendNotification:vi.fn()}));
vi.mock("@/server/logging",()=>({logServerError:vi.fn(),logServerEvent:vi.fn()}));

import {updateStaffAppointmentStatus,cancelPatientAppointmentById,assignStaffAppointmentClinician,requestAppointment} from "./appointment.service";
import {requireUser} from "@/server/auth/require-user";
import {requirePatient} from "@/server/auth/require-patient";
import {requirePermission} from "@/server/permissions/require-permission";
import {findAppointmentForOrganization,findAppointmentForPatient,findPatientAppointmentDetails,cancelPatientAppointment,updateAppointmentStatus,updateAppointmentClinician,createValidatedAppointmentRequest} from "@/server/repositories/appointment.repository";
import {sendNotification} from "@/server/services/notification.service";
import {resolvePatient} from "@/server/services/patient.service";
import {findPublicFacility} from "@/server/repositories/facility.repository";
import {findPublicDepartmentForFacility} from "@/server/repositories/department.repository";
import {findPublicService} from "@/server/repositories/service.repository";
import {resolveGeneratedBookingSlot} from "@/server/services/booking.service";
import {listAssignableClinicians,listClinicianAvailability,listClinicianBusyIntervals} from "@/server/repositories/scheduling.repository";
import {generateSlots} from "@/server/services/scheduling.service";

const sendMock=vi.mocked(sendNotification);
const staffAppointment={
  id:"apt-1",status:"scheduled",scheduledStart:"2026-12-01T09:00:00.000Z",scheduledEnd:"2026-12-01T09:30:00.000Z",
  patient:{id:"pat-1",name:"Ada Lovelace",number:"PT-1",phone:null,email:"ada@example.com"},
  facility:{id:"fac-1",name:"Main Facility",timezone:"Africa/Kampala"},
  department:{id:"dep-1",name:"General Medicine"},
  service:{id:"svc-1",name:"Consultation"},
  clinician:null,createdByLabel:"Patient self-service",
};

beforeEach(()=>{
  vi.clearAllMocks();
  vi.mocked(requirePermission).mockResolvedValue({membership:{organization_id:"org-1"}} as never);
  vi.mocked(updateAppointmentStatus).mockResolvedValue(undefined as never);
  vi.mocked(updateAppointmentClinician).mockResolvedValue(undefined as never);
  vi.mocked(cancelPatientAppointment).mockResolvedValue(undefined as never);
  sendMock.mockResolvedValue(undefined as never);
});

describe("updateStaffAppointmentStatus notifications",()=>{
  it("notifies the patient when staff changes the status",async()=>{
    vi.mocked(findAppointmentForOrganization).mockResolvedValue(staffAppointment as never);
    await updateStaffAppointmentStatus("apt-1","confirmed");
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      type:"appointment_status_changed",
      recipientEmail:"ada@example.com",
      recipientName:"Ada Lovelace",
      subject:"Appointment Confirmed",
    }));
    expect(sendMock.mock.calls[0][0].message).toContain("Consultation");
    expect(sendMock.mock.calls[0][0].metadata).toMatchObject({appointment_id:"apt-1",status:"confirmed"});
  });

  it("does not fail the update when notification delivery fails",async()=>{
    vi.mocked(findAppointmentForOrganization).mockResolvedValue(staffAppointment as never);
    sendMock.mockRejectedValue(new Error("db down"));
    await expect(updateStaffAppointmentStatus("apt-1","confirmed")).resolves.toBeUndefined();
    expect(updateAppointmentStatus).toHaveBeenCalled();
  });

  it("still notifies by patient id when the patient has no email",async()=>{
    vi.mocked(findAppointmentForOrganization).mockResolvedValue({...staffAppointment,patient:{...staffAppointment.patient,email:null}} as never);
    await updateStaffAppointmentStatus("apt-1","confirmed");
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({type:"appointment_status_changed",recipientPatientId:"pat-1",recipientEmail:null}));
  });
});

describe("cancelPatientAppointmentById notifications",()=>{
  const patient={id:"pat-1",first_name:"Ada",last_name:"Lovelace",email:"ada@example.com"};

  it("notifies the patient after cancellation",async()=>{
    vi.mocked(requirePatient).mockResolvedValue({user:{id:"u1"},patient} as never);
    vi.mocked(findAppointmentForPatient).mockResolvedValue({status:"requested"} as never);
    vi.mocked(findPatientAppointmentDetails).mockResolvedValue({id:"apt-1",status:"requested",scheduledStart:"2026-12-01T09:00:00.000Z",scheduledEnd:null,createdAt:"",reason:null,facility:{name:"Main",addressLine:null,city:null,district:null},departmentName:"General Medicine",serviceName:"Consultation",clinicianName:null} as never);
    await cancelPatientAppointmentById("apt-1");
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({type:"appointment_cancelled",recipientEmail:"ada@example.com",subject:"Appointment cancelled"}));
  });
});

describe("assignStaffAppointmentClinician notifications",()=>{
  it("notifies the patient when a doctor is assigned",async()=>{
    // PostgREST returns timestamptz as "+00:00" while generateSlots emits ".000Z" — same instant, different string.
    vi.mocked(findAppointmentForOrganization).mockResolvedValue({...staffAppointment,scheduledStart:"2026-12-01T11:00:00+02:00"} as never);
    vi.mocked(listAssignableClinicians).mockResolvedValue([{membershipId:"m1",userId:"doc-1",displayName:"Grace Achieng",professionalTitle:"Dr"}] as never);
    vi.mocked(listClinicianAvailability).mockResolvedValue({rules:[],exceptions:[]} as never);
    vi.mocked(listClinicianBusyIntervals).mockResolvedValue([] as never);
    vi.mocked(generateSlots).mockReturnValue([{startsAt:"2026-12-01T09:00:00.000Z"} as never]);
    await assignStaffAppointmentClinician("apt-1","doc-1");
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({type:"appointment_clinician_assigned",recipientEmail:"ada@example.com"}));
    expect(sendMock.mock.calls[0][0].message).toContain("Dr Grace Achieng");
  });

  it("does not notify when the assignment is cleared",async()=>{
    vi.mocked(findAppointmentForOrganization).mockResolvedValue(staffAppointment as never);
    await assignStaffAppointmentClinician("apt-1",null);
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("requestAppointment notifications",()=>{
  it("confirms receipt to the patient after booking",async()=>{
    vi.mocked(requireUser).mockResolvedValue({id:"u1",email:"ada@example.com"} as never);
    vi.mocked(findPublicFacility).mockResolvedValue({id:"fac-1",organization_id:"org-1",timezone:"Africa/Kampala",name:"Main Facility"} as never);
    vi.mocked(findPublicDepartmentForFacility).mockResolvedValue({id:"dep-1",facility_id:"fac-1",organization_id:"org-1",name:"General Medicine",opening_hours:null} as never);
    vi.mocked(findPublicService).mockResolvedValue({id:"svc-1",name:"Consultation",organization_id:"org-1",facility_id:null,department_id:null,duration_minutes:30} as never);
    vi.mocked(resolveGeneratedBookingSlot).mockResolvedValue({clinicianSlug:"dr-x",startsAt:"2027-01-15T09:00:00.000Z"} as never);
    vi.mocked(resolvePatient).mockResolvedValue({id:"pat-1"} as never);
    vi.mocked(createValidatedAppointmentRequest).mockResolvedValue({id:"apt-9"} as never);
    const input={facility_id:"11111111-1111-4111-8111-111111111111",department_id:"22222222-2222-4222-8222-222222222222",service_id:"33333333-3333-4333-8333-333333333333",scheduled_start:"2027-01-15T09:00:00.000Z",first_name:"Ada",last_name:"Lovelace",phone:"0700000000",email:"ada@example.com"};
    const result=await requestAppointment(input as never);
    expect(result).toEqual({id:"apt-9"});
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({type:"appointment_requested",recipientEmail:"ada@example.com",subject:"Appointment request received"}));
    expect(sendMock.mock.calls[0][0].message).toContain("Consultation");
  });
});
