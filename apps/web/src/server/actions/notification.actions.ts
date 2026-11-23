"use server";

import {revalidatePath} from "next/cache";

import {requirePatient} from "@/server/auth/require-patient";
import {markAllNotificationsRead,markNotificationRead} from "@/server/services/notification.service";

export async function markNotificationReadAction(id:string){
  const {patient}=await requirePatient();
  try{
    await markNotificationRead(id,patient.id);
    revalidatePath("/portal");
    return {success:true};
  }catch{
    return {error:"Unable to update notifications."};
  }
}

export async function markAllNotificationsReadAction(){
  const {patient}=await requirePatient();
  try{
    await markAllNotificationsRead(patient.id);
    revalidatePath("/portal");
    return {success:true};
  }catch{
    return {error:"Unable to update notifications."};
  }
}
