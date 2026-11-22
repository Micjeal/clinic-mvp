import {z} from "zod";
export const authSchema = z.object({email:z.string().email(),password:z.string().min(8)});
export const staffPasswordChangeSchema = z.object({currentPassword:z.string().min(1),newPassword:z.string().min(12),confirmPassword:z.string().min(12)}).refine((value)=>value.newPassword===value.confirmPassword,{path:["confirmPassword"],message:"New passwords do not match."});
export const patientProfileSchema = z.object({
  first_name:z.string().min(1,"First name is required").max(100),
  middle_name:z.string().max(100).optional().nullable(),
  last_name:z.string().min(1,"Last name is required").max(100),
  phone:z.string().max(20).optional().nullable(),
  email:z.string().email().optional().nullable(),
  date_of_birth:z.string().optional().nullable(),
  sex:z.enum(["female","male","intersex","unknown"]).optional().nullable(),
  address_line:z.string().max(200).optional().nullable(),
  city:z.string().max(100).optional().nullable(),
  district:z.string().max(100).optional().nullable(),
  emergency_contact_name:z.string().max(100).optional().nullable(),
  emergency_contact_phone:z.string().max(20).optional().nullable(),
});
