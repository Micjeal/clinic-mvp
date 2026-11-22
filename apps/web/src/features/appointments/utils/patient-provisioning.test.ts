import {describe,expect,it} from "vitest";
import {buildPatientInsert,patientRegistrationDetails} from "../../../server/patient-provisioning-input";

const user={id:"user-1",email:"patient@example.com",user_metadata:{first_name:" Ada ",last_name:" Lovelace ",phone:" 0700 000 000 ",organization_id:"untrusted"}};

describe("patient provisioning inputs",()=>{
  it("maps personal registration metadata and verified email",()=>{expect(patientRegistrationDetails(user)).toEqual({firstName:"Ada",lastName:"Lovelace",phone:"0700 000 000",email:"patient@example.com"});});
  it("rejects incomplete patient names",()=>{expect(patientRegistrationDetails({...user,user_metadata:{first_name:"Ada",last_name:""}})).toBeNull();});
  it("uses server-supplied organization and facility values",()=>{const record=buildPatientInsert(user,"org-server","facility-server");expect(record.organization_id).toBe("org-server");expect(record.primary_facility_id).toBe("facility-server");expect(record.organization_id).not.toBe(user.user_metadata.organization_id);expect(record.auth_user_id).toBe("user-1");expect(record.created_by).toBe("user-1");});
});
