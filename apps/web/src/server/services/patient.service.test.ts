import {beforeEach,describe,expect,it,vi} from "vitest";

vi.mock("server-only",()=>({}));
vi.mock("@/server/repositories/patient.repository",()=>({findPatientByAuthUserId:vi.fn(),createPatient:vi.fn()}));
vi.mock("@/server/repositories/staff.repository",()=>({hasActiveStaffMembership:vi.fn()}));
vi.mock("@/config/clinic",()=>({clinicOrganizationId:vi.fn(),clinicDefaultFacilityId:vi.fn()}));
vi.mock("@/server/logging",()=>({logServerError:vi.fn(),logServerEvent:vi.fn()}));

import {ensurePatientForAuthenticatedUser} from "./patient.service";
import {findPatientByAuthUserId,createPatient} from "@/server/repositories/patient.repository";
import {hasActiveStaffMembership} from "@/server/repositories/staff.repository";
import {clinicOrganizationId,clinicDefaultFacilityId} from "@/config/clinic";
import {ValidationError} from "@/server/errors";
import {patientSetupMessage} from "@/server/patient-provisioning-input";

const findMock=vi.mocked(findPatientByAuthUserId);
const createMock=vi.mocked(createPatient);
const staffMock=vi.mocked(hasActiveStaffMembership);
const orgMock=vi.mocked(clinicOrganizationId);
const facMock=vi.mocked(clinicDefaultFacilityId);

const user={id:"user-1",email:"patient@example.com",user_metadata:{first_name:"Ada",last_name:"Lovelace",phone:"0700",full_name:"Ada Lovelace"}};
const patientRow={id:"patient-1",first_name:"Ada",last_name:"Lovelace"};

beforeEach(()=>{
  vi.clearAllMocks();
  orgMock.mockReturnValue("11111111-1111-4111-8111-111111111111");
  facMock.mockReturnValue("22222222-2222-4222-8222-222222222222");
});

describe("ensurePatientForAuthenticatedUser",()=>{
  it("returns the existing patient record without inserting",async()=>{
    findMock.mockResolvedValue(patientRow as never);
    await expect(ensurePatientForAuthenticatedUser(user)).resolves.toEqual(patientRow);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("creates a patient record for a new non-staff user",async()=>{
    findMock.mockResolvedValue(null);
    staffMock.mockResolvedValue(false);
    createMock.mockResolvedValue({id:"patient-9"} as never);
    await expect(ensurePatientForAuthenticatedUser(user)).resolves.toEqual({id:"patient-9"});
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({organization_id:"11111111-1111-4111-8111-111111111111",primary_facility_id:"22222222-2222-4222-8222-222222222222",auth_user_id:"user-1",created_by:"user-1",first_name:"Ada",last_name:"Lovelace"}));
  });

  it("rejects staff accounts instead of provisioning them as patients",async()=>{
    findMock.mockResolvedValue(null);
    staffMock.mockResolvedValue(true);
    await expect(ensurePatientForAuthenticatedUser(user)).rejects.toBeInstanceOf(ValidationError);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("rejects users whose metadata lacks names",async()=>{
    findMock.mockResolvedValue(null);
    staffMock.mockResolvedValue(false);
    await expect(ensurePatientForAuthenticatedUser({...user,user_metadata:{first_name:"Ada",last_name:""}})).rejects.toThrow(patientSetupMessage);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("maps missing organization configuration to the safe patient message",async()=>{
    findMock.mockResolvedValue(null);
    staffMock.mockResolvedValue(false);
    orgMock.mockImplementation(()=>{throw new Error("CLINIC_ORGANIZATION_ID must be configured with a valid UUID for patient provisioning.");});
    await expect(ensurePatientForAuthenticatedUser(user)).rejects.toThrow(patientSetupMessage);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns the concurrently created patient on unique violation",async()=>{
    findMock.mockResolvedValueOnce(null).mockResolvedValueOnce(patientRow as never);
    staffMock.mockResolvedValue(false);
    createMock.mockRejectedValue({code:"23505",message:"duplicate key"});
    await expect(ensurePatientForAuthenticatedUser(user)).resolves.toEqual(patientRow);
  });

  it("maps RLS insert rejection to the safe patient message",async()=>{
    findMock.mockResolvedValue(null);
    staffMock.mockResolvedValue(false);
    createMock.mockRejectedValue({code:"42501",message:"new row violates row-level security policy"});
    await expect(ensurePatientForAuthenticatedUser(user)).rejects.toThrow(patientSetupMessage);
  });

  it("maps foreign key violations to the safe patient message",async()=>{
    findMock.mockResolvedValue(null);
    staffMock.mockResolvedValue(false);
    createMock.mockRejectedValue({code:"23503",message:"violates foreign key constraint"});
    await expect(ensurePatientForAuthenticatedUser(user)).rejects.toThrow(patientSetupMessage);
  });

  it("maps patient lookup failures to the safe patient message",async()=>{
    findMock.mockRejectedValue({code:"PGRST000",message:"connection error"});
    await expect(ensurePatientForAuthenticatedUser(user)).rejects.toThrow(patientSetupMessage);
  });

  it("maps staff membership check failures to the safe patient message",async()=>{
    findMock.mockResolvedValue(null);
    staffMock.mockRejectedValue({code:"42501",message:"permission denied"});
    await expect(ensurePatientForAuthenticatedUser(user)).rejects.toThrow(patientSetupMessage);
    expect(createMock).not.toHaveBeenCalled();
  });
});
