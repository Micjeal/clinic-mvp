const fs = require("fs");
const path = require("path");
const envPath = path.join(__dirname, "..", "apps", "web", ".env.local");
let env = fs.readFileSync(envPath, "utf8");
if (env.charCodeAt(0) === 0xfeff) env = env.slice(1);
const get = (k) => { const m = env.match(new RegExp("^" + k + "=([^\\r\\n]*)", "m")); return m ? m[1].trim() : null; };
const url = get("NEXT_PUBLIC_SUPABASE_URL");
const key = get("SUPABASE_SECRET_KEY");
const headers = { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json", Prefer: "return=representation" };
async function q(p, o = {}) { const r = await fetch(url + "/rest/v1/" + p, { ...o, headers: { ...headers, ...(o.headers || {}) } }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; }

async function main() {
  const APPT = "2b8e50aa-58b4-46d1-b6b4-67b0428fbc41";
  const a = (await q(`appointments?id=eq.${APPT}&select=id,organization_id,facility_id,department_id,service_id,patient_id,clinician_user_id,status,created_by`)).body[0];
  console.log("appt:", a.status);
  const existing = await q(`encounters?appointment_id=eq.${APPT}&select=id`);
  if (existing.body?.length) { console.log("encounter already exists:", existing.body[0].id); return; }
  const staff = (await q(`staff_memberships?organization_id=eq.${a.organization_id}&is_active=eq.true&select=user_id,roles!inner(role_key)&roles.role_key=eq.receptionist&limit=1`)).body[0];
  const enc = await q("encounters", { method: "POST", body: JSON.stringify({ organization_id: a.organization_id, facility_id: a.facility_id, department_id: a.department_id, service_id: a.service_id, patient_id: a.patient_id, appointment_id: a.id, clinician_user_id: a.clinician_user_id, encounter_type: "outpatient", status: "open", started_at: new Date().toISOString(), created_by: staff?.user_id ?? null }) });
  console.log("encounter:", enc.status, JSON.stringify(enc.body).slice(0, 200));
  const encId = enc.body?.[0]?.id;
  if (!encId) return;
  const que = await q("queue_entries", { method: "POST", body: JSON.stringify({ organization_id: a.organization_id, facility_id: a.facility_id, department_id: a.department_id, encounter_id: encId, status: "waiting_triage", priority: "routine", created_by: staff?.user_id ?? null }) });
  console.log("queue:", que.status, JSON.stringify(que.body).slice(0, 200));
}
main().catch((e) => { console.error(e); process.exit(1); });
