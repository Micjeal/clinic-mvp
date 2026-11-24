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
const headers = { apikey: key, Authorization: "Bearer " + key };
const ORG = "11111111-1111-4111-8111-111111111111";

async function q(path) {
  const r = await fetch(url + "/rest/v1/" + path, { headers });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return t; }
}

async function main() {
  // 1. Real appointment scheduled_start format
  const appts = await q(`appointments?select=id,status,scheduled_start,scheduled_end,facility_id,department_id,service_id,clinician_user_id&organization_id=eq.${ORG}&order=scheduled_start.desc&limit=5`);
  console.log("APPOINTMENTS:", JSON.stringify(appts, null, 2));

  // 2. Doctor memberships
  const members = await q(`staff_memberships?select=id,user_id,is_active,roles(role_key),profiles(full_name,professional_title)&organization_id=eq.${ORG}`);
  console.log("MEMBERSHIPS:", JSON.stringify(members, null, 2));

  // 3. Department + service assignments for those memberships
  const memberIds = (Array.isArray(members) ? members : []).map((m) => m.id);
  if (memberIds.length) {
    const inList = memberIds.join(",");
    const deptAssign = await q(`staff_department_assignments?select=membership_id,department_id&membership_id=in.(${inList})`);
    console.log("DEPT ASSIGNMENTS:", JSON.stringify(deptAssign, null, 2));
    const svcAssign = await q(`staff_service_assignments?select=membership_id,service_id,is_active&membership_id=in.(${inList})`);
    console.log("SERVICE ASSIGNMENTS:", JSON.stringify(svcAssign, null, 2));
  }

  // 4. Availability rules
  const avail = await q(`clinician_availability_rules?select=membership_id,facility_id,day_of_week,start_time,end_time,is_active&membership_id=in.(${memberIds.join(",") || "00000000-0000-0000-0000-000000000000"})`);
  console.log("AVAILABILITY RULES:", JSON.stringify(avail, null, 2));

  // 5. Departments/services for context
  const deps = await q(`departments?select=id,name,facility_id,is_active,is_public&organization_id=eq.${ORG}`);
  console.log("DEPARTMENTS:", JSON.stringify(deps, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
