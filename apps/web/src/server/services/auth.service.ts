import "server-only";
import {createClient} from "@/lib/supabase/server";
export async function signInUser(email:string,password:string){const supabase=await createClient();return supabase.auth.signInWithPassword({email,password});}
export async function signUpUser(email:string,password:string,metadata:{full_name:string;first_name:string;last_name:string;phone:string},emailRedirectTo:string){const supabase=await createClient();return supabase.auth.signUp({email,password,options:{data:metadata,emailRedirectTo}});}
export async function signOutUser(){const supabase=await createClient();return supabase.auth.signOut();}
export async function resetPasswordForEmail(email:string,redirectTo:string){const supabase=await createClient();return supabase.auth.resetPasswordForEmail(email,{redirectTo});}
export async function updateUserPassword(password:string){const supabase=await createClient();return supabase.auth.updateUser({password});}
