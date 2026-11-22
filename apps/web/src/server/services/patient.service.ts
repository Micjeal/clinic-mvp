import "server-only";
import type {TablesInsert} from "@clinic/database";
import {findPatientByAuthUserId,createPatient} from "@/server/repositories/patient.repository";
import {clinicDefaultFacilityId,clinicOrganizationId} from "@/config/clinic";
import {ValidationError} from "@/server/errors";
import {logServerError,logServerEvent} from "@/server/logging";
import type {User} from "@supabase/supabase-js";
import {buildPatientInsert,patientSetupMessage} from "@/server/patient-provisioning-input";
import {hasActiveStaffMembership} from "@/server/repositories/staff.repository";

function isUniqueViolation(error:unknown){return typeof error==="object"&&error!==null&&"code" in error&&(error as {code?:unknown}).code==="23505";}

function describeProvisioningError(error:unknown){
  const code=typeof error==="object"&&error!==null&&"code" in error?String((error as {code?:unknown}).code??""):"";
  if(code==="23505")return"unique-violation";
  if(code==="23503")return"foreign-key-violation";
  if(code==="23502")return"not-null-violation";
  if(code==="23514")return"check-violation";
  if(code==="42501")return"row-level-security";
  if(code==="42P01")return"missing-relation";
  if(error instanceof Error&&error.message.includes("must be configured"))return"configuration";
  if(error instanceof Error&&error.message===patientSetupMessage)return"missing-metadata";
  return"unknown";
}

async function findConcurrentPatient(userId:string){
  try{const concurrent=await findPatientByAuthUserId(userId);return concurrent??null;}catch(error){logServerError("patient-provisioning","concurrent-lookup-failed",error,{userId});return null;}
}

export async function ensurePatientForAuthenticatedUser(user:Pick<User,"id"|"email"|"user_metadata">){
  let existing;
  try{existing=await findPatientByAuthUserId(user.id);}
  catch(error){logServerError("patient-provisioning","patient-lookup-failed",error,{kind:describeProvisioningError(error),userId:user.id});throw new ValidationError(patientSetupMessage);}
  if(existing){logServerEvent("patient-provisioning","existing-patient-found",{userId:user.id});return existing;}
  let isStaff=false;
  try{isStaff=await hasActiveStaffMembership(user.id);}
  catch(error){logServerError("patient-provisioning","staff-membership-check-failed",error,{kind:describeProvisioningError(error),userId:user.id});throw new ValidationError(patientSetupMessage);}
  if(isStaff){logServerEvent("patient-provisioning","staff-account-rejected",{userId:user.id});throw new ValidationError(patientSetupMessage);}
  let record:TablesInsert<"patients">;
  try{record=buildPatientInsert(user,clinicOrganizationId(),clinicDefaultFacilityId());}
  catch(error){
    const kind=describeProvisioningError(error);
    logServerError("patient-provisioning","patient-input-build-failed",error,{kind,userId:user.id,hasFirstName:typeof user.user_metadata?.first_name==="string"&&user.user_metadata.first_name.trim().length>0,hasLastName:typeof user.user_metadata?.last_name==="string"&&user.user_metadata.last_name.trim().length>0});
    if(error instanceof Error&&error.message===patientSetupMessage)throw new ValidationError(patientSetupMessage);
    throw new ValidationError(patientSetupMessage);
  }
  try{const created=await createPatient(record);logServerEvent("patient-provisioning","patient-created",{userId:user.id,patientId:created.id});return created;}
  catch(error){
    if(isUniqueViolation(error)){const concurrent=await findConcurrentPatient(user.id);if(concurrent){logServerEvent("patient-provisioning","concurrent-patient-found",{userId:user.id});return concurrent;}}
    logServerError("patient-provisioning","patient-insert-failed",error,{kind:describeProvisioningError(error),userId:user.id});
    throw new ValidationError(patientSetupMessage);
  }
}

export async function resolvePatient(userId:string,input:{organizationId:string;facilityId:string;firstName:string;lastName:string;phone:string;email:string}){const existing=await findPatientByAuthUserId(userId);if(existing)return existing;if(await hasActiveStaffMembership(userId))throw new ValidationError(patientSetupMessage);const record:TablesInsert<"patients">={organization_id:input.organizationId,primary_facility_id:input.facilityId,auth_user_id:userId,first_name:input.firstName,last_name:input.lastName,phone:input.phone,email:input.email,created_by:userId};try{return await createPatient(record);}catch(error){if(isUniqueViolation(error)){const concurrent=await findPatientByAuthUserId(userId);if(concurrent)return concurrent;}logServerError("patient-provisioning","resolve-patient-insert-failed",error,{kind:describeProvisioningError(error),userId});throw error;}}
