"use server";
import {redirect} from "next/navigation";
import {staffPasswordChangeSchema} from "@clinic/validation";
import {AuthenticationError,AuthorizationError,safeServerMessage} from "@/server/errors";
import {changeStaffPassword} from "@/server/services/staff-password.service";

export async function changeStaffPasswordAction(_previous:unknown,formData:FormData){
  const parsed=staffPasswordChangeSchema.safeParse({currentPassword:formData.get("currentPassword"),newPassword:formData.get("newPassword"),confirmPassword:formData.get("confirmPassword")});
  if(!parsed.success){
    const issue=parsed.error.issues[0];
    return {error:issue?.message||"Enter a valid password and confirmation."};
  }
  try{
    await changeStaffPassword({currentPassword:parsed.data.currentPassword,newPassword:parsed.data.newPassword});
  }catch(error){
    if(error instanceof AuthenticationError||error instanceof AuthorizationError)return {error:"This account does not have access to the staff portal."};
    return {error:safeServerMessage(error,"Unable to update your password. Please try again.")};
  }
  redirect("/staff");
}
