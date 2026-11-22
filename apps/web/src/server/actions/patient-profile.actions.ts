"use server";
import {revalidatePath} from "next/cache";
import {patientProfileSchema} from "@clinic/validation";
import {safeServerMessage} from "@/server/errors";
import {requirePatient} from "@/server/auth/require-patient";
import {updatePatientProfile} from "@/server/repositories/patient.repository";

export async function updatePatientProfileAction(_previous:unknown,formData:FormData){
  const {patient}=await requirePatient();
  const parsed=patientProfileSchema.safeParse({
    first_name:formData.get("first_name"),
    middle_name:formData.get("middle_name"),
    last_name:formData.get("last_name"),
    phone:formData.get("phone"),
    email:formData.get("email"),
    date_of_birth:formData.get("date_of_birth"),
    sex:formData.get("sex"),
    address_line:formData.get("address_line"),
    city:formData.get("city"),
    district:formData.get("district"),
    emergency_contact_name:formData.get("emergency_contact_name"),
    emergency_contact_phone:formData.get("emergency_contact_phone"),
  });
  if(!parsed.success)return {error:"Please check your information and try again."};
  try{
    await updatePatientProfile(patient.id,parsed.data);
    revalidatePath("/portal/profile");
    revalidatePath("/portal");
    return {success:"Profile updated successfully."};
  }catch(error){
    return {error:safeServerMessage(error,"Unable to update profile. Please try again.")};
  }
}
