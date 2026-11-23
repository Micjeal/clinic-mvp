import {beforeEach,describe,expect,it,vi} from "vitest";

vi.mock("server-only",()=>({}));

const rpcMock=vi.fn();

vi.mock("@/lib/supabase/server",()=>({createClient:vi.fn()}));
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:vi.fn()}));
vi.mock("@/server/permissions/require-permission",()=>({requirePermission:vi.fn()}));
vi.mock("@/server/repositories/staff.repository",()=>({hasRolePermission:vi.fn()}));
vi.mock("@/server/repositories/patient.repository",()=>({createPatient:vi.fn()}));
vi.mock("@/server/repositories/reception.repository",()=>({
  createEncounter:vi.fn(),
  createQueueEntry:vi.fn(),
  findAppointmentForCheckIn:vi.fn(),
  getQueueEntry:vi.fn(),
  listQueueEntries:vi.fn(),
  updateQueueEntry:vi.fn(),
  createVitals:vi.fn(),
  validateWalkInScope:vi.fn(),
  findPatientByNumber:vi.fn(),
}));
vi.mock("@/server/logging",()=>({logServerError:vi.fn(),logServerEvent:vi.fn()}));

import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {requirePermission} from "@/server/permissions/require-permission";
import {hasRolePermission} from "@/server/repositories/staff.repository";
import {
  findAppointmentForCheckIn,
  getQueueEntry,
  updateQueueEntry,
  createEncounter,
  createQueueEntry,
} from "@/server/repositories/reception.repository";
import {checkInAppointment,transitionQueue} from "./reception.service";
import {AuthorizationError,NotFoundError,ValidationError} from "@/server/errors";

const staff=(userId:string,roleId="role-1")=>({user:{id:userId},membership:{organization_id:"org-1",role_id:roleId,primary_facility_id:null}});

beforeEach(()=>{
  vi.clearAllMocks();
  vi.mocked(createClient).mockResolvedValue({rpc:rpcMock} as never);
  vi.mocked(createAdminClient).mockReturnValue({
    from:()=>({update:()=>({eq:()=>({eq:vi.fn().mockResolvedValue({error:null})})})}),
  } as never);
  vi.mocked(requirePermission).mockResolvedValue(staff("staff-1") as never);
  vi.mocked(hasRolePermission).mockResolvedValue(true);
  vi.mocked(updateQueueEntry).mockImplementation(async(_id,_org,patch)=>({id:"q1",...patch}) as never);
});

describe("checkInAppointment (F-02 atomic RPC)",()=>{
  it("delegates all writes to the check_in_appointment RPC",async()=>{
    vi.mocked(findAppointmentForCheckIn).mockResolvedValue({id:"appt-1",status:"confirmed"} as never);
    rpcMock.mockResolvedValue({data:{encounterId:"enc-1",queueId:"q-1",existing:false},error:null});
    const result=await checkInAppointment("appt-1");
    expect(rpcMock).toHaveBeenCalledWith("check_in_appointment",{p_appointment_id:"appt-1"});
    expect(result).toEqual({encounterId:"enc-1",queueId:"q-1"});
    // No partial writes may happen outside the transaction.
    expect(createEncounter).not.toHaveBeenCalled();
    expect(createQueueEntry).not.toHaveBeenCalled();
  });

  it("is idempotent when the RPC reports an existing encounter",async()=>{
    vi.mocked(findAppointmentForCheckIn).mockResolvedValue({id:"appt-1",status:"checked_in"} as never);
    rpcMock.mockResolvedValue({data:{encounterId:"enc-1",queueId:"q-1",existing:true},error:null});
    const result=await checkInAppointment("appt-1");
    expect(result).toEqual({encounterId:"enc-1",queueId:"q-1"});
  });

  it("throws NotFoundError when the appointment does not exist",async()=>{
    vi.mocked(findAppointmentForCheckIn).mockResolvedValue(null as never);
    await expect(checkInAppointment("missing")).rejects.toBeInstanceOf(NotFoundError);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("maps RPC status failures to ValidationError",async()=>{
    vi.mocked(findAppointmentForCheckIn).mockResolvedValue({id:"appt-1",status:"requested"} as never);
    rpcMock.mockResolvedValue({data:null,error:{message:"This appointment must be confirmed before check-in."}});
    await expect(checkInAppointment("appt-1")).rejects.toBeInstanceOf(ValidationError);
  });

  it("maps RPC permission failures to AuthorizationError",async()=>{
    vi.mocked(findAppointmentForCheckIn).mockResolvedValue({id:"appt-1",status:"confirmed"} as never);
    rpcMock.mockResolvedValue({data:null,error:{message:"You do not have permission to check in patients."}});
    await expect(checkInAppointment("appt-1")).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("transitionQueue clinical completion (F-03)",()=>{
  const entryFor=(clinicianUserId:string|null)=>({
    id:"q1",status:"waiting_clinician",priority:"routine",
    encounters:{id:"enc-1",patient_id:"pat-1",clinician_user_id:clinicianUserId},
  });

  it("lets the assigned clinician start a consult",async()=>{
    vi.mocked(requirePermission).mockResolvedValue(staff("doc-1") as never);
    vi.mocked(hasRolePermission).mockImplementation(async(_role,key)=>key==="queue.manage"||key==="queue.clinical");
    vi.mocked(getQueueEntry).mockResolvedValue(entryFor("doc-1") as never);
    const result=await transitionQueue("q1","with_clinician");
    expect(updateQueueEntry).toHaveBeenCalledWith("q1","org-1",expect.objectContaining({status:"with_clinician",consult_started_by:"doc-1"}));
    expect(result.status).toBe("with_clinician");
  });

  it("rejects a non-assigned staff member without the override permission",async()=>{
    vi.mocked(requirePermission).mockResolvedValue(staff("reception-1") as never);
    vi.mocked(hasRolePermission).mockImplementation(async(_role,key)=>key==="queue.manage");
    vi.mocked(getQueueEntry).mockResolvedValue(entryFor("doc-1") as never);
    await expect(transitionQueue("q1","with_clinician")).rejects.toBeInstanceOf(AuthorizationError);
    expect(updateQueueEntry).not.toHaveBeenCalled();
  });

  it("rejects a clinician completing another clinician's encounter",async()=>{
    vi.mocked(requirePermission).mockResolvedValue(staff("doc-2") as never);
    vi.mocked(hasRolePermission).mockImplementation(async(_role,key)=>key==="queue.manage"||key==="queue.clinical");
    vi.mocked(getQueueEntry).mockResolvedValue({...entryFor("doc-1"),status:"with_clinician"} as never);
    await expect(transitionQueue("q1","completed")).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("requires a reason for a supervisory override",async()=>{
    vi.mocked(requirePermission).mockResolvedValue(staff("admin-1") as never);
    vi.mocked(hasRolePermission).mockImplementation(async(_role,key)=>key==="queue.manage"||key==="queue.override");
    vi.mocked(getQueueEntry).mockResolvedValue({...entryFor("doc-1"),status:"with_clinician"} as never);
    await expect(transitionQueue("q1","completed")).rejects.toBeInstanceOf(ValidationError);
    expect(updateQueueEntry).not.toHaveBeenCalled();
  });

  it("records the override actor and reason for an authorized supervisor",async()=>{
    vi.mocked(requirePermission).mockResolvedValue(staff("admin-1") as never);
    vi.mocked(hasRolePermission).mockImplementation(async(_role,key)=>key==="queue.manage"||key==="queue.override");
    vi.mocked(getQueueEntry).mockResolvedValue({...entryFor("doc-1"),status:"with_clinician"} as never);
    await transitionQueue("q1","completed",undefined,{overrideReason:"Clinician unavailable; visit verified by supervisor"});
    expect(updateQueueEntry).toHaveBeenCalledWith("q1","org-1",expect.objectContaining({
      status:"completed",
      consult_completed_by:"admin-1",
      completion_override_reason:"Clinician unavailable; visit verified by supervisor",
    }));
  });

  it("does not allow completing an unassigned encounter without an override",async()=>{
    vi.mocked(requirePermission).mockResolvedValue(staff("doc-1") as never);
    vi.mocked(hasRolePermission).mockImplementation(async(_role,key)=>key==="queue.manage"||key==="queue.clinical");
    vi.mocked(getQueueEntry).mockResolvedValue({...entryFor(null),status:"with_clinician"} as never);
    await expect(transitionQueue("q1","completed")).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("preserves operational cancellation for receptionists",async()=>{
    vi.mocked(requirePermission).mockResolvedValue(staff("reception-1") as never);
    vi.mocked(hasRolePermission).mockImplementation(async(_role,key)=>key==="queue.manage");
    vi.mocked(getQueueEntry).mockResolvedValue(entryFor("doc-1") as never);
    await transitionQueue("q1","cancelled");
    expect(updateQueueEntry).toHaveBeenCalledWith("q1","org-1",expect.objectContaining({status:"cancelled"}));
  });
});
