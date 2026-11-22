import {redirect} from "next/navigation";
import {AuthenticationError,AuthorizationError,PasswordChangeRequiredError} from "@/server/errors";
import {getStaffPortalContext} from "@/server/services/staff-portal.service";
import {StaffAccessDenied} from "@/features/staff/components/access-denied";
import {StaffShell} from "@/features/staff/components/staff-shell";

async function loadStaffPortal(){
  try{
    return {context:await getStaffPortalContext(),denied:false as const};
  }catch(error){
    if(error instanceof AuthenticationError)redirect("/staff/login");
    if(error instanceof PasswordChangeRequiredError)redirect("/staff/change-password");
    if(error instanceof AuthorizationError)return {context:null,denied:true as const};
    throw error;
  }
}

export default async function StaffPortalLayout({children}:{children:React.ReactNode}){
  const result=await loadStaffPortal();
  if(result.denied)return <StaffAccessDenied/>;
  return <StaffShell context={result.context}>{children}</StaffShell>;
}
