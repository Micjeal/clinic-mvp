import "server-only";
import {createClient} from "@/lib/supabase/server";
import {requireStaff} from "@/server/auth/require-staff";
import {ValidationError} from "@/server/errors";
import {clearStaffPasswordSetup} from "@/server/repositories/staff.repository";

export async function changeStaffPassword(input:{currentPassword:string;newPassword:string}){
  const staff=await requireStaff();
  if(!staff.membership.must_change_password)throw new ValidationError("This account does not require a temporary password change.");
  if(input.currentPassword===input.newPassword)throw new ValidationError("Choose a new password different from your temporary password.");
  const supabase=await createClient();
  const email=staff.user.email;
  if(!email)throw new ValidationError("Your staff account does not have a sign-in email.");

  const verification=await supabase.auth.signInWithPassword({email,password:input.currentPassword});
  if(verification.error)throw new ValidationError("The current temporary password is incorrect.");
  const update=await supabase.auth.updateUser({password:input.newPassword});
  if(update.error)throw new ValidationError("Unable to update your password. Please try again.");
  const cleared=await clearStaffPasswordSetup(staff.membership.id);
  if(!cleared)throw new ValidationError("Your password was updated, but the account setup state could not be completed. Please contact your clinic administrator.");
  await supabase.auth.signOut({scope:"others"});
}
