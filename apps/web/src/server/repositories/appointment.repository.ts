import "server-only";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import type {Tables,TablesInsert} from "@clinic/database";
import type {StaffAppointment} from "@/features/appointments/types/staff-appointment.types";
import type {PatientAppointment} from "@/types/patient-portal";

type Related<T> = T | T[] | null;
type StaffAppointmentRow = Tables<"appointments"> & {
  patients: Related<{id:string;first_name:string;last_name:string;patient_number:string;phone:string|null;email:string|null;auth_user_id:string|null}>;
  facilities: Related<{id:string;name:string;timezone:string}>;
  departments: Related<{id:string;name:string;opening_hours:unknown}>;
  services: Related<{id:string;name:string}>;
  clinician: Related<{full_name:string|null;professional_title:string|null}>;
};
type PatientAppointmentRow = Pick<Tables<"appointments">,"id"|"status"|"scheduled_start"|"scheduled_end"|"created_at"|"reason"|"organization_id"> & {
  facilities: Related<{name:string;address_line:string|null;city:string|null;district:string|null}>;
  departments: Related<{name:string}>;
  services: Related<{name:string}>;
  clinician: Related<{full_name:string|null;professional_title:string|null}>;
};

function one<T>(value:Related<T>):T|null{return Array.isArray(value)?value[0]??null:value;}
function mapStaffAppointment(row:StaffAppointmentRow):StaffAppointment{
  const patient=one(row.patients),facility=one(row.facilities),department=one(row.departments),service=one(row.services),clinician=one(row.clinician);
  return {
    id:row.id,status:row.status,scheduledStart:row.scheduled_start,scheduledEnd:row.scheduled_end,
    createdAt:row.created_at,updatedAt:row.updated_at,reason:row.reason,
    patient:{id:patient?.id??"",name:patient?[patient.first_name,patient.last_name].filter(Boolean).join(" "):"Patient unavailable",number:patient?.patient_number??"Not available",phone:patient?.phone??null,email:patient?.email??null},
    facility:{id:facility?.id??row.facility_id,name:facility?.name??"Facility unavailable",timezone:facility?.timezone??"Africa/Kampala"},
    department:{id:department?.id??row.department_id,name:department?.name??"Department unavailable",openingHours:department?.opening_hours??null},
    service:service?{id:service.id,name:service.name}:null,
    clinician: row.clinician_user_id ? { name: clinician?.full_name ?? "Assigned clinician", title: clinician?.professional_title ?? null } : null,
    clinicianUserId: row.clinician_user_id,
    createdByLabel:patient?.auth_user_id&&patient.auth_user_id===row.created_by?"Patient self-service":"Clinic staff",
  };
}

function mapPatientAppointment(row:PatientAppointmentRow):PatientAppointment{
  const facility=one(row.facilities),department=one(row.departments),service=one(row.services),clinician=one(row.clinician);
  return {
    id:row.id,
    status:row.status,
    scheduledStart:row.scheduled_start,
    scheduledEnd:row.scheduled_end,
    createdAt:row.created_at,
    reason:row.reason,
    facility:{name:facility?.name??null,addressLine:facility?.address_line??null,city:facility?.city??null,district:facility?.district??null},
    departmentName:department?.name??null,
    serviceName:service?.name??null,
    clinicianName: clinician?.full_name ?? null,
    organizationId: row.organization_id,
  };
}

const staffAppointmentSelect="*,patients!appointments_patient_id_fkey(id,first_name,last_name,patient_number,phone,email,auth_user_id),facilities!appointments_facility_id_fkey(id,name,timezone),departments!appointments_department_id_fkey(id,name,opening_hours),services!appointments_service_id_fkey(id,name),clinician:profiles!appointments_clinician_user_id_fkey(full_name,professional_title)";
const patientAppointmentSelect="id,status,scheduled_start,scheduled_end,created_at,reason,organization_id,clinician_user_id,facilities!appointments_facility_id_fkey(name,address_line,city,district),departments!appointments_department_id_fkey(name),services!appointments_service_id_fkey(name),clinician:profiles!appointments_clinician_user_id_fkey(full_name,professional_title)";

export async function createAppointment(input:TablesInsert<"appointments">){const supabase=await createClient();const {data,error}=await supabase.from("appointments").insert(input).select("id").single();if(error)throw error;return data;}
export async function createValidatedAppointmentRequest(input:{patientId:string;facilityId:string;departmentId:string;serviceId:string;clinicianSlug:string;scheduledStart:string;reason:string|null}){const supabase=await createClient();const {data,error}=await supabase.rpc("request_patient_appointment",{p_patient_id:input.patientId,p_facility_id:input.facilityId,p_department_id:input.departmentId,p_service_id:input.serviceId,p_clinician_slug:input.clinicianSlug,p_scheduled_start:input.scheduledStart,p_reason:input.reason||""});if(error)throw error;if(!data)throw new Error("Appointment request was not persisted.");return {id:data};}
export async function listAppointmentsForPatient(patientId:string){const supabase=createAdminClient();const {data,error}=await supabase.from("appointments").select(patientAppointmentSelect).eq("patient_id",patientId).order("scheduled_start",{ascending:false});if(error)throw error;return ((data??[]) as unknown as PatientAppointmentRow[]).map(mapPatientAppointment);}
export async function findAppointmentForPatient(id:string,patientId:string){const supabase=await createClient();const {data,error}=await supabase.from("appointments").select("status").eq("id",id).eq("patient_id",patientId).maybeSingle();if(error)throw error;return data;}
export async function findPatientAppointmentDetails(id:string,patientId:string){const supabase=createAdminClient();const {data,error}=await supabase.from("appointments").select(patientAppointmentSelect).eq("id",id).eq("patient_id",patientId).maybeSingle();if(error)throw error;return data?mapPatientAppointment(data as unknown as PatientAppointmentRow):null;}
export async function cancelPatientAppointment(id:string,patientId:string){const supabase=await createClient();const {error}=await supabase.from("appointments").update({status:"cancelled"}).eq("id",id).eq("patient_id",patientId);if(error)throw error;}
export async function listAppointmentsForOrganization(organizationId:string){const supabase=await createClient();const {data,error}=await supabase.from("appointments").select(staffAppointmentSelect).eq("organization_id",organizationId).order("scheduled_start",{ascending:true});if(error)throw error;return ((data??[]) as unknown as StaffAppointmentRow[]).map(mapStaffAppointment);}
export async function findAppointmentForOrganization(id:string,organizationId:string){const supabase=await createClient();const {data,error}=await supabase.from("appointments").select(staffAppointmentSelect).eq("id",id).eq("organization_id",organizationId).maybeSingle();if(error)throw error;return data?mapStaffAppointment(data as unknown as StaffAppointmentRow):null;}
export async function updateAppointmentStatus(id:string,organizationId:string,status:string){const supabase=await createClient();const {error}=await supabase.from("appointments").update({status}).eq("id",id).eq("organization_id",organizationId);if(error)throw error;}
export async function updateAppointmentClinician(id:string,organizationId:string,clinicianUserId:string|null){const supabase=await createClient();const {error}=await supabase.from("appointments").update({clinician_user_id:clinicianUserId}).eq("id",id).eq("organization_id",organizationId);if(error)throw error;}
