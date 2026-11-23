import {redirect} from "next/navigation";

import {PatientPortalShell} from "@/components/layout/patient-portal-shell";
import {AuthenticationError,NotFoundError} from "@/server/errors";
import {getPatientPortalShellContext} from "@/server/auth/patient-portal-context";
import {listPortalNotifications,type PortalNotification} from "@/server/services/notification.service";
import {logServerError} from "@/server/logging";

async function loadPatientContext(){
  try{return await getPatientPortalShellContext();}
  catch(error){
    if(error instanceof AuthenticationError)redirect("/login?next=/portal");
    if(error instanceof NotFoundError)redirect("/login?setup=patient-profile");
    throw error;
  }
}

async function loadPortalNotifications(patientId:string):Promise<PortalNotification[]>{
  try{return await listPortalNotifications(patientId);}
  catch(error){
    logServerError("notifications","list-portal-failed",error);
    return [];
  }
}

export default async function PatientPortalLayout({children}:{children:React.ReactNode}){
  const context=await loadPatientContext();
  const notifications=await loadPortalNotifications(context.patient.id);
  return <PatientPortalShell {...context} notifications={notifications}>{children}</PatientPortalShell>;
}
