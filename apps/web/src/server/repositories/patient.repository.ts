import "server-only";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import type {Tables,TablesInsert} from "@clinic/database";

const patientPortalSelect="id,first_name,middle_name,last_name,patient_number,email,phone,date_of_birth,sex,address_line,city,district,country_code,emergency_contact_name,emergency_contact_phone";

export async function findPatientByAuthUserId(userId:string){const supabase=await createClient();const {data,error}=await supabase.from("patients").select(patientPortalSelect).eq("auth_user_id",userId).maybeSingle();if(error)throw error;return data;}
export async function createPatient(input:TablesInsert<"patients">){const supabase=await createClient();const {data,error}=await supabase.from("patients").insert(input).select("id").single();if(error)throw error;return data as Pick<Tables<"patients">,"id">;}
export async function updatePatientProfile(patientId:string,input:{first_name:string;middle_name?:string|null;last_name:string;phone?:string|null;email?:string|null;date_of_birth?:string|null;sex?:"female"|"male"|"intersex"|"unknown"|null;address_line?:string|null;city?:string|null;district?:string|null;emergency_contact_name?:string|null;emergency_contact_phone?:string|null}){const supabase=createAdminClient();const {data,error}=await supabase.from("patients").update(input).eq("id",patientId).select("id").single();if(error)throw error;return data;}
