import {z} from "zod";
export const authSchema = z.object({email:z.string().email(),password:z.string().min(8)});
export const staffPasswordChangeSchema = z.object({currentPassword:z.string().min(1),newPassword:z.string().min(12),confirmPassword:z.string().min(12)}).refine((value)=>value.newPassword===value.confirmPassword,{path:["confirmPassword"],message:"New passwords do not match."});
