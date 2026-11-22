import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {safeNextPath} from "@/lib/safe-next-path";
import {ensurePatientForAuthenticatedUser} from "@/server/services/patient.service";
import {logServerError} from "@/server/logging";
export async function GET(req:Request){const url=new URL(req.url);const code=url.searchParams.get("code");const next=safeNextPath(url.searchParams.get("next"),"/portal");if(code){const s=await createClient();const exchanged=await s.auth.exchangeCodeForSession(code);if(exchanged.error){logServerError("auth-callback","code-exchange-failed",exchanged.error);return redirect("/login?setup=error");}if(url.searchParams.get("flow")==="patient-registration"){const current=await s.auth.getUser();if(current.error||!current.data.user){logServerError("auth-callback","user-lookup-after-exchange-failed",current.error);return redirect("/login?setup=error");}try{await ensurePatientForAuthenticatedUser(current.data.user);}catch(error){logServerError("auth-callback","patient-provisioning-failed",error);return redirect("/login?setup=patient-profile");}}}redirect(next);}
