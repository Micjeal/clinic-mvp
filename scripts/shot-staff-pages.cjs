const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const envPath = path.join(__dirname, "..", "apps", "web", ".env.local");
let env = fs.readFileSync(envPath, "utf8");
if (env.charCodeAt(0) === 0xfeff) env = env.slice(1);
const get = (k) => { const m = env.match(new RegExp("^" + k + "=([^\\r\\n]*)", "m")); return m ? m[1].trim() : null; };
const url = get("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = get("SUPABASE_SECRET_KEY");
const SITE = process.argv[2] || "http://localhost:3000";
const OUT = process.argv[3] || "staff-shots";
const adminHeaders = { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json", Prefer: "return=representation" };
async function admin(p, o = {}) { const r = await fetch(url + "/rest/v1/" + p, { ...o, headers: { ...adminHeaders, ...(o.headers || {}) } }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; }
async function adminAuth(p, o = {}) { const r = await fetch(url + "/auth/v1/" + p, { ...o, headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json" } }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; }

const PAGES = [
  ["dashboard", "/staff"],
  ["users", "/staff/users"],
  ["appointments", "/staff/appointments"],
  ["facilities", "/staff/facilities"],
  ["departments", "/staff/departments"],
  ["services", "/staff/services"],
  ["queue", "/staff/queue"],
];

async function main() {
  const appt = (await admin(`appointments?select=organization_id,facility_id&limit=1`)).body[0];
  const role = (await admin(`roles?role_key=eq.organization_admin&select=id`)).body[0];
  const email = `e2e-shots-${Date.now()}@example.com`;
  const password = "E2ePass!" + Date.now();
  const cu = await adminAuth("admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  const userId = cu.body.id;
  await admin("profiles", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ id: userId, full_name: "Design Review", status: "active" }) });
  await admin("staff_memberships", { method: "POST", body: JSON.stringify({ user_id: userId, organization_id: appt.organization_id, role_id: role.id, primary_facility_id: appt.facility_id, must_change_password: false, is_active: true }) });
  console.log("user ready");

  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true }).catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(SITE + "/staff/login", { waitUntil: "networkidle" });
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL((u) => u.pathname === "/staff" || u.pathname === "/staff/change-password", { timeout: 30000 });

    for (const [name, pagePath] of PAGES) {
      await page.goto(SITE + pagePath, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(OUT, `${name}-desktop.png`), fullPage: true });
      console.log("shot", name);
    }

    await page.setViewportSize({ width: 820, height: 1100 });
    for (const [name, pagePath] of [["dashboard", "/staff"], ["departments", "/staff/departments"], ["users", "/staff/users"]]) {
      await page.goto(SITE + pagePath, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, `${name}-tablet.png`), fullPage: true });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    for (const [name, pagePath] of [["dashboard", "/staff"], ["departments", "/staff/departments"], ["users", "/staff/users"]]) {
      await page.goto(SITE + pagePath, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, `${name}-mobile.png`), fullPage: true });
    }
    console.log("done");
  } finally {
    await browser.close();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
