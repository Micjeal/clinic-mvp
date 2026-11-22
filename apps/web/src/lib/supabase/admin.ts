import "server-only";
import {createClient as createSupabaseClient} from "@supabase/supabase-js";
import type {Database} from "@clinic/database";

export function createAdminClient(){
  const key=process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key)throw new Error("Supabase Admin credentials are not configured. Set SUPABASE_SECRET_KEY on the server. Legacy SUPABASE_SERVICE_ROLE_KEY is also supported.");
  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!,key,{auth:{autoRefreshToken:false,persistSession:false}});
}
