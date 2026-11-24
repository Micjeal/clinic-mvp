const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const envPath = path.join(__dirname, "..", "apps", "web", ".env.local");
let env = fs.readFileSync(envPath, "utf8");
if (env.charCodeAt(0) === 0xfeff) env = env.slice(1);
const get = (k) => { const m = env.match(new RegExp("^" + k + "=([^\\r\\n]*)", "m")); return m ? m[1].trim() : null; };
const url = get("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = get("SUPABASE_SECRET_KEY");
const SITE = "https://hospica.vercel.app";
const adminHeaders = { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json", Prefer: "return=representation" };
async function admin(p, o = {}) { const r = await fetch(url + "/rest/v1/" + p, { ...o, headers: { ...adminHeaders, ...(o.headers || {}) } }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; }
async function adminAuth(p, o = {}) { const r = await fetch(url + "/auth/v1/" + p, { ...o, headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json" } }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; }

async function main() {
  const appt = (await admin(`appointments?select=organization_id,facility_id&limit=1`)).body[0];
  const role = (await admin(`roles?role_key=eq.receptionist&select=id`)).body[0];
  const email = `e2e-login-${Date.now()}@example.com`;
  const password = "E2ePass!" + Date.now();
  const cu = await adminAuth("admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  const userId = cu.body.id;
  await admin("profiles", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ id: userId, full_name: "E2E Login", status: "active" }) });
  const mem = await admin("staff_memberships", { method: "POST", body: JSON.stringify({ user_id: userId, organization_id: appt.organization_id, role_id: role.id, primary_facility_id: appt.facility_id, must_change_password: false, is_active: true }) });
  console.log("user:", email, "membership:", mem.status);

  const browser = await chromium.launch({ channel: "chrome", headless: true }).catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage();
  try {
    await page.goto(SITE + "/staff/login", { waitUntil: "networkidle" });
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(8000);
    console.log("URL after submit:", page.url());
    console.log("PAGE TEXT:\n" + (await page.locator("body").innerText()).slice(0, 1500));
    const cookies = await page.context().cookies();
    console.log("cookies:", cookies.map(c => c.name).join(", "));
  } finally {
    await browser.close();
    const m = await admin(`staff_memberships?user_id=eq.${userId}&select=id`);
    for (const x of m.body || []) await admin(`staff_memberships?id=eq.${x.id}`, { method: "DELETE" });
    await admin(`profiles?id=eq.${userId}`, { method: "DELETE" });
    await adminAuth(`admin/users/${userId}`, { method: "DELETE" });
    console.log("cleanup done");
  }
}
main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
