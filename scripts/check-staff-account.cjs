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

async function q(path) {
  const r = await fetch(url + "/rest/v1/" + path, { headers });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return t; }
}

async function main() {
  // All staff memberships with user + role info
  const members = await q(`staff_memberships?select=id,user_id,organization_id,role_id,is_active,must_change_password,created_at,roles(role_key,name),profiles(full_name,professional_title,status)`);
  console.log("STAFF MEMBERSHIPS:", JSON.stringify(members, null, 2));

  // Auth users (admin API)
  const r = await fetch(url + "/auth/v1/admin/users?per_page=50", { headers });
  const users = await r.json();
  const list = users.users || users;
  console.log("AUTH USERS:", JSON.stringify((Array.isArray(list) ? list : []).map(u => ({ id: u.id, email: u.email, confirmed: !!u.email_confirmed_at, created: u.created_at })), null, 2));

  // Role permissions for each role_id present
  const roleIds = [...new Set((Array.isArray(members) ? members : []).map(m => m.role_id))];
  for (const rid of roleIds) {
    const perms = await q(`role_permissions?select=permission_key&role_id=eq.${rid}`);
    console.log(`ROLE ${rid} permissions:`, JSON.stringify(perms));
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
