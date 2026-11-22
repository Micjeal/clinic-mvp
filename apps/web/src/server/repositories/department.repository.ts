import "server-only";
import {createClient} from "@/lib/supabase/server";
import type {Tables} from "@clinic/database";

export async function listPublicDepartments():Promise<Tables<"departments">[]> {const supabase=await createClient();const {data,error}=await supabase.from("departments").select("*").eq("is_active",true).eq("is_public",true).order("sort_order");if(error)throw error;return data??[];}
export async function findPublicDepartment(id:string){const supabase=await createClient();const {data,error}=await supabase.from("departments").select("*").eq("id",id).eq("is_active",true).eq("is_public",true).single();if(error)throw error;return data;}
export async function findPublicDepartmentForFacility(id:string,facilityId:string){const supabase=await createClient();const {data,error}=await supabase.from("departments").select("id,facility_id,organization_id,opening_hours").eq("id",id).eq("facility_id",facilityId).eq("is_active",true).eq("is_public",true).single();if(error)throw error;return data;}
