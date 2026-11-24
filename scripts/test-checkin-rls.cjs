const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", "apps", "web", ".env.local");
let env = fs.readFileSync(envPath, "utf8");
if (env.charCodeAt(0) === 0xfeff) env = env.slice(1);
const get = (k) => {
  const m = env.match(new RegExp("^" + k + "=([^\\r\\n]*)", "m"));
  return m ? m[1].trim() : null;
};

const url = get("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = get("SUPABASE_SECRET_KEY");
const anonKey = get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const adminHeaders = { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json", Prefer: "return=representation" };
const APPT = "2b8e50aa-58b4-46d1-b6b4-67b0428fbc41";

async function admin(pathname, options = {}) {
  const r = await fetch(url + "/rest/v1/" + pathname, { ...options, headers: { ...adminHeaders, ...(options.headers || {}) } });
  const t = await r.text();
  let body; try { body = JSON.parse(t); } catch { body = t; }
  return { status: r.status, body };
}
async function adminAuth(pathname, options = {}) {
  const r = await fetch(url + "/auth/v1/" + pathname, { ...options, headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json" } });
  const t = await r.text();
  let body; try { body = JSON.parse(t); } catch { body = t; }
  return { status: r.status, body };
}

async function main() {
  // 1. Look up appointment + receptionist role + org
  const appt = (await admin(`appointments?id=eq.${APPT}&select=id,organization_id,facility_id,department_id,service_id,patient_id,clinician_user_id,status`)).body;
  console.log("APPOINTMENT:", JSON.stringify(appt));
  if (!appt?.[0]) throw new Error("appointment not found");
  const a = appt[0];
  const roles = (await admin(`roles?role_key=eq.receptionist&select=id,role_key`)).body;
  console.log("ROLE:", JSON.stringify(roles));
  const roleId = roles[0].id;

  // 2. Create temp auth user
  const email = `e2e-reception-${Date.now()}@example.com`;
  const password = "E2eTest!" + Date.now();
  const created = await adminAuth("admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  console.log("CREATE USER:", created.status, created.body?.id || JSON.stringify(created.body).slice(0, 200));
  const userId = created.body.id;

  let encounterId = null, queueId = null, membershipId = null;
  try {
    // 3. Profile + membership (same as createStaffProvisioning)
    const prof = await admin("profiles", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ id: userId, full_name: "E2E Reception Test", professional_title: "Receptionist", status: "active" }) });
    console.log("PROFILE:", prof.status);
    const mem = await admin("staff_memberships", { method: "POST", body: JSON.stringify({ user_id: userId, organization_id: a.organization_id, role_id: roleId, primary_facility_id: a.facility_id, must_change_password: false, is_active: true }) });
    console.log("MEMBERSHIP:", mem.status, JSON.stringify(mem.body).slice(0, 300));
    membershipId = mem.body?.[0]?.id;

    // 4. Sign in as the test user (publishable key, password grant)
    const tokenRes = await fetch(url + "/auth/v1/token?grant_type=password", { method: "POST", headers: { apikey: anonKey, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const tokenBody = await tokenRes.json();
    console.log("SIGNIN:", tokenRes.status, tokenBody.access_token ? "token ok" : JSON.stringify(tokenBody).slice(0, 300));
    if (!tokenBody.access_token) throw new Error("no access token");
    const jwt = tokenBody.access_token;
    const uheaders = { apikey: anonKey, Authorization: "Bearer " + jwt, "Content-Type": "application/json", Prefer: "return=representation" };
    const ucall = async (p, options = {}) => { const r = await fetch(url + "/rest/v1/" + p, { ...options, headers: { ...uheaders, ...(options.headers || {}) } }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; };

    // 5. Replicate checkInAppointment exactly
    const findAppt = await ucall(`appointments?id=eq.${APPT}&organization_id=eq.${a.organization_id}&select=id,organization_id,facility_id,department_id,service_id,patient_id,clinician_user_id,status`);
    console.log("USER APPT LOOKUP:", findAppt.status, JSON.stringify(findAppt.body).slice(0, 200));

    const enc = await ucall("encounters", { method: "POST", body: JSON.stringify({ organization_id: a.organization_id, facility_id: a.facility_id, department_id: a.department_id, service_id: a.service_id, patient_id: a.patient_id, appointment_id: a.id, clinician_user_id: a.clinician_user_id, encounter_type: "outpatient", status: "open", started_at: new Date().toISOString(), created_by: userId }) });
    console.log("ENCOUNTER INSERT:", enc.status, JSON.stringify(enc.body).slice(0, 400));
    encounterId = enc.body?.[0]?.id;

    if (encounterId) {
      const q = await ucall("queue_entries", { method: "POST", body: JSON.stringify({ organization_id: a.organization_id, facility_id: a.facility_id, department_id: a.department_id, encounter_id: encounterId, status: "waiting_triage", priority: "routine", created_by: userId }) });
      console.log("QUEUE INSERT:", q.status, JSON.stringify(q.body).slice(0, 400));
      queueId = q.body?.[0]?.id;

      const upd = await ucall(`appointments?id=eq.${APPT}&organization_id=eq.${a.organization_id}`, { method: "PATCH", body: JSON.stringify({ status: "checked_in" }) });
      console.log("APPT STATUS UPDATE:", upd.status, JSON.stringify(upd.body).slice(0, 200));
    }
  } finally {
    // cleanup test artifacts
    if (queueId) console.log("cleanup queue:", (await admin(`queue_entries?id=eq.${queueId}`, { method: "DELETE" })).status);
    if (encounterId) console.log("cleanup encounter:", (await admin(`encounters?id=eq.${encounterId}`, { method: "DELETE" })).status);
    await admin(`appointments?id=eq.${APPT}`, { method: "PATCH", body: JSON.stringify({ status: "confirmed" }) });
    if (membershipId) await admin(`staff_memberships?id=eq.${membershipId}`, { method: "DELETE" });
    await admin(`profiles?id=eq.${userId}`, { method: "DELETE" });
    await adminAuth(`admin/users/${userId}`, { method: "DELETE" });
    console.log("cleanup done");
  }
}
main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
