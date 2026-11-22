"use server";
import {redirect} from "next/navigation";
import {authSchema} from "@clinic/validation";
import {Permissions} from "@clinic/permissions";
import {AuthorizationError} from "@/server/errors";
import {requirePermission} from "@/server/permissions/require-permission";
import {signInUser,signOutUser} from "@/server/services/auth.service";
import {decideStaffPortalDestination} from "@/features/staff/utils/staff-access";

export async function staffSignInAction(_previous:unknown,formData:FormData){
  const parsed=authSchema.safeParse({email:formData.get("email"),password:formData.get("password")});
  if(!parsed.success)return {error:"Enter a valid email and password."};
  const result=await signInUser(parsed.data.email,parsed.data.password);
  if(result.error)return {error:"Unable to sign in with those details."};
  let destination:"change-password"|"staff"="staff";
  try{const staff=await requirePermission(Permissions.APPOINTMENT_READ);destination=decideStaffPortalDestination(staff.membership.must_change_password);}catch(error){
    await signOutUser();
    if(error instanceof AuthorizationError)return {error:"This account does not have access to the staff portal."};
    return {error:"Unable to verify staff access. Please try again."};
  }
  redirect(destination==="change-password"?"/staff/change-password":"/staff");
}

export async function staffSignOutAction(){await signOutUser();redirect("/staff/login");}
