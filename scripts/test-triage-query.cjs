const fs = require("fs");
const path = require("path");
const envPath = path.join(__dirname, "..", "apps", "web", ".env.local");
let env = fs.readFileSync(envPath, "utf8");
if (env.charCodeAt(0) === 0xfeff) env = env.slice(1);
const get = (k) => { const m = env.match(new RegExp("^" + k + "=([^\\r\\n]*)", "m")); return m ? m[1].trim() : null; };
const url = get("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = get("SUPABASE_SECRET_KEY");
const anonKey = get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const adminHeaders = { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json", Prefer: "return=representation" };
async function admin(p, o = {}) { const r = await fetch(url + "/rest/v1/" + p, { ...o, headers: { ...adminHeaders, ...(o.headers || {}) } }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; }
async function adminAuth(p, o = {}) { const r = await fetch(url + "/auth/v1/" + p, { ...o, headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json" } }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; }

async function main() {
  const entry = (await admin(`queue_entries?status=in.(waiting_triage,in_triage)&select=id,organization_id&limit=1`)).body[0];
  console.log("queue entry:", JSON.stringify(entry));
  if (!entry) { console.log("no entries"); return; }
  const appt = (await admin(`appointments?select=organization_id,facility_id&limit=1`)).body[0];
  const role = (await admin(`roles?role_key=eq.nurse&select=id`)).body[0];
  const email = `e2e-q-${Date.now()}@example.com`;
  const password = "E2ePass!" + Date.now();
  const cu = await adminAuth("admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  const userId = cu.body.id;
  await admin("profiles", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ id: userId, full_name: "E2E Q", status: "active" }) });
  await admin("staff_memberships", { method: "POST", body: JSON.stringify({ user_id: userId, organization_id: appt.organization_id, role_id: role.id, primary_facility_id: appt.facility_id, must_change_password: false, is_active: true }) });
  const tok = await fetch(url + "/auth/v1/token?grant_type=password", { method: "POST", headers: { apikey: anonKey, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const jwt = (await tok.json()).access_token;
  console.log("jwt:", !!jwt);
  const uh = { apikey: anonKey, Authorization: "Bearer " + jwt };
  const select = "*,department:departments!queue_entries_department_id_fkey(name),encounter:encounters!queue_entries_encounter_id_fkey(id,patient_id,chief_complaint,appointment_id,clinician_user_id,service_id,patient:patients!encounters_patient_id_fkey(id,patient_number,first_name,last_name,date_of_birth,sex))";
  const r = await fetch(`${url}/rest/v1/queue_entries?id=eq.${entry.id}&organization_id=eq.${entry.organization_id}&select=${encodeURIComponent(select)}`, { headers: uh });
  const t = await r.text();
  console.log("GET QUEUE ENTRY:", r.status, t.slice(0, 800));
  // also test vitals select permission (recordTriage reads nothing else, but check encounter read)
  const cleanup = async () => {
    const m = await admin(`staff_memberships?user_id=eq.${userId}&select=id`);
    for (const x of m.body || []) await admin(`staff_memberships?id=eq.${x.id}`, { method: "DELETE" });
    await admin(`profiles?id=eq.${userId}`, { method: "DELETE" });
    await adminAuth(`admin/users/${userId}`, { method: "DELETE" });
  };
  await cleanup();
  console.log("cleanup done");
}
main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
