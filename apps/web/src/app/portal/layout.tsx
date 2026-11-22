import {redirect} from "next/navigation";

import {PatientPortalShell} from "@/components/layout/patient-portal-shell";
import {AuthenticationError,NotFoundError} from "@/server/errors";
import {getPatientPortalShellContext} from "@/server/auth/patient-portal-context";

async function loadPatientContext(){
  try{return await getPatientPortalShellContext();}
  catch(error){
    if(error instanceof AuthenticationError)redirect("/login?next=/portal");
    if(error instanceof NotFoundError)redirect("/login?setup=patient-profile");
    throw error;
  }
}

export default async function PatientPortalLayout({children}:{children:React.ReactNode}){
  const context=await loadPatientContext();
  return <PatientPortalShell {...context}>{children}</PatientPortalShell>;
}
