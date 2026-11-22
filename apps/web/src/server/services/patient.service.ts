import "server-only";
import type {TablesInsert} from "@clinic/database";
import {findPatientByAuthUserId,createPatient} from "@/server/repositories/patient.repository";
import {clinicDefaultFacilityId,clinicOrganizationId} from "@/config/clinic";
import {ValidationError} from "@/server/errors";
import type {User} from "@supabase/supabase-js";
import {buildPatientInsert,patientSetupMessage} from "@/server/patient-provisioning-input";
import {hasActiveStaffMembership} from "@/server/repositories/staff.repository";

function isUniqueViolation(error:unknown){return typeof error==="object"&&error!==null&&"code" in error&&(error as {code?:unknown}).code==="23505";}

export async function ensurePatientForAuthenticatedUser(user:Pick<User,"id"|"email"|"user_metadata">){
  const existing=await findPatientByAuthUserId(user.id);
  if(existing)return existing;
  if(await hasActiveStaffMembership(user.id))throw new ValidationError(patientSetupMessage);
  let record:TablesInsert<"patients">;try{record=buildPatientInsert(user,clinicOrganizationId(),clinicDefaultFacilityId());}catch(error){if(error instanceof Error&&error.message===patientSetupMessage)throw new ValidationError(patientSetupMessage);throw error;}
  try{return await createPatient(record);}catch(error){
    if(isUniqueViolation(error)){const concurrent=await findPatientByAuthUserId(user.id);if(concurrent)return concurrent;}
    throw new ValidationError(patientSetupMessage);
  }
}

export async function resolvePatient(userId:string,input:{organizationId:string;facilityId:string;firstName:string;lastName:string;phone:string;email:string}){const existing=await findPatientByAuthUserId(userId);if(existing)return existing;if(await hasActiveStaffMembership(userId))throw new ValidationError(patientSetupMessage);const record:TablesInsert<"patients">={organization_id:input.organizationId,primary_facility_id:input.facilityId,auth_user_id:userId,first_name:input.firstName,last_name:input.lastName,phone:input.phone,email:input.email,created_by:userId};try{return await createPatient(record);}catch(error){if(isUniqueViolation(error)){const concurrent=await findPatientByAuthUserId(userId);if(concurrent)return concurrent;}throw error;}}
