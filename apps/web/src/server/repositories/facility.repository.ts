import "server-only";
import {createClient} from "@/lib/supabase/server";
import type {Tables} from "@clinic/database";

export async function listPublicFacilities():Promise<Tables<"facilities">[]> {const supabase=await createClient();const {data,error}=await supabase.from("facilities").select("*").eq("is_active",true).eq("is_public",true).order("name");if(error)throw error;return data??[];}
export async function findPublicFacility(id:string){const supabase=await createClient();const {data,error}=await supabase.from("facilities").select("id,organization_id,timezone,name").eq("id",id).eq("is_active",true).eq("is_public",true).single();if(error)throw error;return data;}
