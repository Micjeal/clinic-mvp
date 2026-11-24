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
const key = get("SUPABASE_SECRET_KEY");
const headers = { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };

async function q(p) {
  const r = await fetch(url + "/rest/v1/" + p, { headers });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return t; }
}

async function main() {
  console.log("APPOINTMENTS:", JSON.stringify(await q("appointments?select=id,status,scheduled_start,created_at&order=created_at.desc&limit=15"), null, 1));
  console.log("ENCOUNTERS:", JSON.stringify(await q("encounters?select=id,status,encounter_type,created_at&order=created_at.desc&limit=10"), null, 1));
  console.log("QUEUE:", JSON.stringify(await q("queue_entries?select=id,status,priority,checked_in_at&order=checked_in_at.desc&limit=10"), null, 1));
  console.log("VITALS count:", JSON.stringify(await q("vitals?select=id&limit=5")));
  // receptionist role permissions actually in DB
  console.log("RECEPTIONIST PERMS:", JSON.stringify(await q("role_permissions?select=permission_key,roles!inner(role_key)&roles.role_key=eq.receptionist")));
}
main().catch((e) => { console.error(e); process.exit(1); });
