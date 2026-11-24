import "server-only";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";

export async function findActiveMembership(userId:string){const supabase=await createClient();const {data,error}=await supabase.from("staff_memberships").select("id,organization_id,role_id,job_title,primary_facility_id,must_change_password").eq("user_id",userId).eq("is_active",true).maybeSingle();if(error)throw error;return data;}
export async function hasActiveStaffMembership(userId:string){const membership=await findActiveMembership(userId);return Boolean(membership);}
export async function hasAnyRolePermission(roleId:string){const supabase=await createClient();const {count,error}=await supabase.from("role_permissions").select("permission_key",{count:"exact",head:true}).eq("role_id",roleId);if(error)throw error;return (count??0)>0;}
export async function hasRolePermission(roleId:string,permissionKey:string){const supabase=await createClient();const {data,error}=await supabase.from("role_permissions").select("permission_key").eq("role_id",roleId).eq("permission_key",permissionKey).maybeSingle();if(error)throw error;return Boolean(data);}
export async function clearStaffPasswordSetup(membershipId:string){const supabase=createAdminClient();const {data,error}=await supabase.from("staff_memberships").update({must_change_password:false}).eq("id",membershipId).eq("is_active",true).eq("must_change_password",true).select("id").maybeSingle();if(error)throw error;return Boolean(data);}

export async function getStaffDisplayContext(input:{userId:string;organizationId:string;roleId:string}){
  const supabase=await createClient();
  const [profileResult,roleResult,organizationResult,permissionsResult]=await Promise.all([
    supabase.from("profiles").select("full_name,professional_title").eq("id",input.userId).maybeSingle(),
    supabase.from("roles").select("name,role_key").eq("id",input.roleId).maybeSingle(),
    supabase.from("organizations").select("name,timezone").eq("id",input.organizationId).maybeSingle(),
    supabase.from("role_permissions").select("permission_key").eq("role_id",input.roleId),
  ]);
  const error=profileResult.error||roleResult.error||organizationResult.error||permissionsResult.error;
  if(error)throw error;
  return {
    profile:profileResult.data,
    role:roleResult.data,
    organization:organizationResult.data,
    permissions:(permissionsResult.data??[]).map(item=>item.permission_key),
  };
}
