import {beforeEach,describe,expect,it,vi} from "vitest";

vi.mock("server-only",()=>({}));

vi.mock("@/server/permissions/require-permission",()=>({requirePermission:vi.fn()}));
vi.mock("@/server/repositories/catalog.repository",()=>({
  listFacilitiesForOrganization:vi.fn(),
  findFacilityForOrganization:vi.fn(),
  createFacility:vi.fn(),
  updateFacility:vi.fn(),
  countActiveDepartmentsForFacility:vi.fn(),
  listDepartmentsForOrganization:vi.fn(),
  findDepartmentForOrganization:vi.fn(),
  createDepartment:vi.fn(),
  updateDepartment:vi.fn(),
  listDepartmentServices:vi.fn(),
  listDepartmentStaff:vi.fn(),
  departmentAppointmentStats:vi.fn(),
  listRecentDepartmentAppointments:vi.fn(),
  listOrgMembershipsForAssignment:vi.fn(),
  assignDepartmentStaff:vi.fn(),
  removeDepartmentStaff:vi.fn(),
  setDepartmentHead:vi.fn(),
  listServicesForOrganization:vi.fn(),
  findServiceForOrganization:vi.fn(),
  createService:vi.fn(),
  updateService:vi.fn(),
  countAppointmentsForService:vi.fn(),
}));
vi.mock("@/server/repositories/staff.repository",()=>({hasRolePermission:vi.fn()}));

import {requirePermission} from "@/server/permissions/require-permission";
import {hasRolePermission} from "@/server/repositories/staff.repository";
import * as repo from "@/server/repositories/catalog.repository";
import {
  assignDepartmentStaff,
  listFacilities,
  parseOpeningHours,
  removeDepartmentStaff,
  saveDepartment,
  saveFacility,
  saveService,
  setDepartmentHead,
  setFacilityActive,
} from "./catalog.service";
import {AuthorizationError,NotFoundError,ValidationError} from "@/server/errors";

const staff=(roleId="role-admin")=>({user:{id:"user-1"},membership:{organization_id:"org-1",role_id:roleId,primary_facility_id:null}});

const facilityInput={
  name:"Main Clinic",code:"main",facility_type:"clinic",
  address_line:null,city:"Kampala",district:null,country_code:"UG",
  phone:null,email:null,timezone:"Africa/Kampala",
  is_public:true,is_active:true,
};
const departmentInput={
  name:"Cardiology",code:"cardio",description:null,facility_id:"fac-1",
  phone:null,email:null,opening_hours:{mon:"08:00-17:00"},
  is_public:true,is_active:true,sort_order:0,
};
const serviceInput={
  name:"Consultation",code:"consult",description:null,service_type:"clinical",
  department_id:"dept-1",facility_id:null,
  base_price:50000,currency_code:"UGX",duration_minutes:30,
  is_public:true,is_active:true,
};

beforeEach(()=>{
  vi.clearAllMocks();
  vi.mocked(requirePermission).mockResolvedValue(staff() as never);
  vi.mocked(hasRolePermission).mockResolvedValue(true);
});

describe("permission enforcement",()=>{
  it("requires facility.manage for facility listing",async()=>{
    vi.mocked(requirePermission).mockRejectedValue(new AuthorizationError());
    await expect(listFacilities()).rejects.toBeInstanceOf(AuthorizationError);
    expect(repo.listFacilitiesForOrganization).not.toHaveBeenCalled();
  });

  it("passes the staff role through requirePermission for catalog writes",async()=>{
    vi.mocked(repo.findFacilityForOrganization).mockResolvedValue({id:"fac-1"} as never);
    vi.mocked(repo.updateFacility).mockResolvedValue(undefined as never);
    await setFacilityActive("fac-1",false);
    expect(requirePermission).toHaveBeenCalledWith("facility.manage");
  });
});

describe("facility lifecycle",()=>{
  it("blocks deactivation while active departments depend on the facility",async()=>{
    vi.mocked(repo.countActiveDepartmentsForFacility).mockResolvedValue(2);
    await expect(setFacilityActive("fac-1",false)).rejects.toBeInstanceOf(ValidationError);
    expect(repo.updateFacility).not.toHaveBeenCalled();
  });

  it("allows deactivation once dependent departments are inactive",async()=>{
    vi.mocked(repo.countActiveDepartmentsForFacility).mockResolvedValue(0);
    vi.mocked(repo.updateFacility).mockResolvedValue(undefined as never);
    await setFacilityActive("fac-1",false);
    expect(repo.updateFacility).toHaveBeenCalledWith("fac-1","org-1",{is_active:false});
  });

  it("uppercases facility codes on create and scopes to the staff organization",async()=>{
    vi.mocked(repo.createFacility).mockResolvedValue({id:"fac-new"} as never);
    const result=await saveFacility(null,{...facilityInput,code:"main-hq"});
    expect(repo.createFacility).toHaveBeenCalledWith(expect.objectContaining({organization_id:"org-1",code:"MAIN-HQ"}));
    expect(result.id).toBe("fac-new");
  });
});

describe("department validation",()=>{
  it("rejects a facility outside the organization",async()=>{
    vi.mocked(repo.findFacilityForOrganization).mockResolvedValue(null as never);
    await expect(saveDepartment(null,departmentInput)).rejects.toBeInstanceOf(ValidationError);
    expect(repo.createDepartment).not.toHaveBeenCalled();
  });

  it("scopes department writes to the staff organization",async()=>{
    vi.mocked(repo.findFacilityForOrganization).mockResolvedValue({id:"fac-1"} as never);
    vi.mocked(repo.createDepartment).mockResolvedValue({id:"dept-new"} as never);
    await saveDepartment(null,departmentInput);
    expect(repo.createDepartment).toHaveBeenCalledWith(expect.objectContaining({organization_id:"org-1",facility_id:"fac-1",code:"CARDIO"}));
  });

  it("returns NotFound for an unknown department",async()=>{
    vi.mocked(repo.findDepartmentForOrganization).mockResolvedValue(null as never);
    const {getDepartment}=await import("./catalog.service");
    await expect(getDepartment("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("service relationships",()=>{
  it("rejects a department outside the organization",async()=>{
    vi.mocked(repo.findDepartmentForOrganization).mockResolvedValue(null as never);
    await expect(saveService(null,serviceInput)).rejects.toBeInstanceOf(ValidationError);
    expect(repo.createService).not.toHaveBeenCalled();
  });

  it("rejects a facility outside the organization",async()=>{
    vi.mocked(repo.findDepartmentForOrganization).mockResolvedValue({id:"dept-1"} as never);
    vi.mocked(repo.findFacilityForOrganization).mockResolvedValue(null as never);
    await expect(saveService(null,{...serviceInput,facility_id:"fac-x"})).rejects.toBeInstanceOf(ValidationError);
  });

  it("allows organization-wide services without department or facility",async()=>{
    vi.mocked(repo.createService).mockResolvedValue({id:"svc-new"} as never);
    await saveService(null,{...serviceInput,department_id:null,facility_id:null});
    expect(repo.findDepartmentForOrganization).not.toHaveBeenCalled();
    expect(repo.createService).toHaveBeenCalledWith(expect.objectContaining({organization_id:"org-1",department_id:null}));
  });

  it("scopes service updates by organization",async()=>{
    vi.mocked(repo.findDepartmentForOrganization).mockResolvedValue({id:"dept-1"} as never);
    vi.mocked(repo.updateService).mockResolvedValue(undefined as never);
    await saveService("svc-1",serviceInput);
    expect(repo.updateService).toHaveBeenCalledWith("svc-1","org-1",expect.objectContaining({code:"CONSULT"}));
  });
});

describe("opening hours validation",()=>{
  it("parses valid weekday windows",()=>{
    expect(parseOpeningHours('{"mon":"08:00-17:00","sat":["09:00-12:00","14:00-16:00"]}')).toEqual({
      mon:"08:00-17:00",sat:["09:00-12:00","14:00-16:00"],
    });
  });

  it("returns an empty object for blank input",()=>{
    expect(parseOpeningHours("")).toEqual({});
    expect(parseOpeningHours("   ")).toEqual({});
  });

  it("rejects invalid JSON",()=>{
    expect(()=>parseOpeningHours("not json")).toThrow(ValidationError);
  });

  it("rejects unknown weekdays",()=>{
    expect(()=>parseOpeningHours('{"funday":"08:00-17:00"}')).toThrow(ValidationError);
  });

  it("rejects malformed time windows",()=>{
    expect(()=>parseOpeningHours('{"mon":"8am-5pm"}')).toThrow(ValidationError);
    expect(()=>parseOpeningHours('{"mon":"25:00-26:00"}')).toThrow(ValidationError);
  });
});

describe("department staff assignment",()=>{
  it("assigns staff only after verifying the department belongs to the org",async()=>{
    vi.mocked(repo.findDepartmentForOrganization).mockResolvedValue({id:"dept-1"} as never);
    vi.mocked(repo.assignDepartmentStaff).mockResolvedValue(undefined as never);
    await assignDepartmentStaff("dept-1","mem-1");
    expect(repo.assignDepartmentStaff).toHaveBeenCalledWith("dept-1","mem-1");
  });

  it("rejects assignment to a department outside the org",async()=>{
    vi.mocked(repo.findDepartmentForOrganization).mockResolvedValue(null as never);
    await expect(assignDepartmentStaff("dept-x","mem-1")).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.assignDepartmentStaff).not.toHaveBeenCalled();
  });

  it("requires staff.manage for removal and verifies department scope",async()=>{
    vi.mocked(repo.findDepartmentForOrganization).mockResolvedValue({id:"dept-1"} as never);
    vi.mocked(repo.removeDepartmentStaff).mockResolvedValue(undefined as never);
    await removeDepartmentStaff("dept-1","mem-1");
    expect(requirePermission).toHaveBeenCalledWith("staff.manage");
    expect(repo.removeDepartmentStaff).toHaveBeenCalledWith("dept-1","mem-1");
  });

  it("delegates head designation to the set_department_head RPC",async()=>{
    vi.mocked(repo.findDepartmentForOrganization).mockResolvedValue({id:"dept-1"} as never);
    vi.mocked(repo.setDepartmentHead).mockResolvedValue(undefined as never);
    await setDepartmentHead("dept-1","mem-1");
    expect(requirePermission).toHaveBeenCalledWith("staff.manage");
    expect(repo.setDepartmentHead).toHaveBeenCalledWith("dept-1","mem-1");
  });
});
