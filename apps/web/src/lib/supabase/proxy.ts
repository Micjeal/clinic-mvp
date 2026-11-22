import {createServerClient} from "@supabase/ssr";
import {NextResponse,type NextRequest} from "next/server";
import type {Database} from "@clinic/database";

export async function updateSession(req:NextRequest){
  let response=NextResponse.next({request:req});
  const supabase=createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{cookies:{getAll:()=>req.cookies.getAll(),setAll(values){values.forEach(({name,value})=>req.cookies.set(name,value));response=NextResponse.next({request:req});values.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});
  const {data:{user}}=await supabase.auth.getUser();
  return {response,user};
}
