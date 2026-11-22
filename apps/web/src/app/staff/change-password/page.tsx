import {redirect} from "next/navigation";
import Link from "next/link";
import {Building2,ShieldCheck} from "lucide-react";
import {StaffChangePasswordForm} from "@/features/staff/components/staff-change-password-form";
import {getStaffPasswordSetupContext} from "@/server/services/staff-portal.service";
import {AuthenticationError,AuthorizationError} from "@/server/errors";
import {clinicName} from "@/lib/public-content";

export const metadata={title:"Create your new staff password"};

export default async function StaffChangePasswordPage(){
  try{
    const staff=await getStaffPasswordSetupContext();
    if(!staff.membership.must_change_password)redirect("/staff");
  }catch(error){
    if(error instanceof AuthenticationError)redirect("/staff/login");
    if(error instanceof AuthorizationError)redirect("/staff/login");
    throw error;
  }
  return <div className="staff-surface staff-password-page"><main className="staff-password-card" aria-labelledby="staff-password-title">
    <Link className="staff-login-brand" href="/"><span><Building2 aria-hidden="true" /></span><strong>{clinicName()}</strong></Link>
    <p className="eyebrow">Staff account security</p>
    <h1 id="staff-password-title">Create your new password</h1>
    <p>Your account is using a temporary password. Choose a private password before continuing.</p>
    <div className="staff-password-notice"><ShieldCheck aria-hidden="true" /><span>This password change is required before you can open the staff workspace.</span></div>
    <StaffChangePasswordForm />
  </main></div>;
}
