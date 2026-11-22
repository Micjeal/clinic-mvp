import "server-only";
import {createClient} from "@/lib/supabase/server";
import type {Tables} from "@clinic/database";

export async function listPublicServices():Promise<Tables<"services">[]> {const supabase=await createClient();const {data,error}=await supabase.from("services").select("*").eq("is_active",true).eq("is_public",true).order("name");if(error)throw error;return data??[];}
export async function findPublicService(id:string){const supabase=await createClient();const {data,error}=await supabase.from("services").select("*").eq("id",id).eq("is_active",true).eq("is_public",true).single();if(error)throw error;return data;}
export async function listPublicServicesForDepartment(departmentId:string){const supabase=await createClient();const {data,error}=await supabase.from("services").select("*").eq("department_id",departmentId).eq("is_active",true).eq("is_public",true).order("name");if(error)throw error;return data??[];}
