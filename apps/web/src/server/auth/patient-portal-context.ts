import "server-only";

import {clinicName} from "@/lib/public-content";
import {requirePatient} from "@/server/auth/require-patient";

export async function getPatientPortalShellContext(){
  const {patient,user}=await requirePatient();
  const name=[patient.first_name,patient.middle_name,patient.last_name].filter(Boolean).join(" ")||"Patient";
  const initials=[patient.first_name,patient.last_name].filter(Boolean).map(part=>part?.charAt(0).toUpperCase()).join("").slice(0,2)||"P";
  return {clinic:clinicName(),patient:{id:patient.id,name,email:patient.email||user.email||"Patient account",initials}};
}
