"use server";

import {revalidatePath} from "next/cache";

import {requirePatient} from "@/server/auth/require-patient";
import {markAllNotificationsRead,markNotificationRead} from "@/server/services/notification.service";

export async function markNotificationReadAction(id:string){
  const {patient,user}=await requirePatient();
  const email=patient.email||user.email;
  if(!email)return {error:"Unable to update notifications."};
  try{
    await markNotificationRead(id,email);
    revalidatePath("/portal");
    return {success:true};
  }catch{
    return {error:"Unable to update notifications."};
  }
}

export async function markAllNotificationsReadAction(){
  const {patient,user}=await requirePatient();
  const email=patient.email||user.email;
  if(!email)return {error:"Unable to update notifications."};
  try{
    await markAllNotificationsRead(email);
    revalidatePath("/portal");
    return {success:true};
  }catch{
    return {error:"Unable to update notifications."};
  }
}
