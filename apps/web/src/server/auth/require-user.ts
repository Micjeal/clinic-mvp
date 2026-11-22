import "server-only";
import {AuthenticationError} from "@/server/errors";
import {createClient} from "@/lib/supabase/server";
export async function requireUser(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)throw new AuthenticationError();return user;}
