const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const envPath = path.join(__dirname, "..", "apps", "web", ".env.local");
let env = fs.readFileSync(envPath, "utf8");
if (env.charCodeAt(0) === 0xfeff) env = env.slice(1);
const get = (k) => { const m = env.match(new RegExp("^" + k + "=([^\r\n]*)", "m")); return m ? m[1].trim() : null; };
const url = get("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = get("SUPABASE_SECRET_KEY");
const SITE = "http://localhost:3000";
const adminHeaders = { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json", Prefer: "return=representation" };
async function admin(p, o = {}) { const r = await fetch(url + "/rest/v1/" + p, { ...o, headers: { ...adminHeaders, ...(o.headers || {}) } }); const t = await r.text(); try { return JSON.parse(t); } catch { return t; } }
async function adminAuth(p, o = {}) { const r = await fetch(url + "/auth/v1/" + p, { ...o, headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json" } }); const t = await r.text(); try { return JSON.parse(t); } catch { return t; } }

async function main() {
  const appt = (await admin(`appointments?select=organization_id,facility_id&limit=1`))[0];
  const role = (await admin(`roles?role_key=eq.organization_admin&select=id`))[0];
  const email = `e2e-dom-${Date.now()}@example.com`;
  const password = "E2ePass!" + Date.now();
  const cu = await adminAuth("admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  await admin("profiles", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ id: cu.id, full_name: "DOM Check", status: "active" }) });
  await admin("staff_memberships", { method: "POST", body: JSON.stringify({ user_id: cu.id, organization_id: appt.organization_id, role_id: role.id, primary_facility_id: appt.facility_id, must_change_password: false, is_active: true }) });

  const browser = await chromium.launch({ channel: "chrome", headless: true }).catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const failed = [];
  page.on("response", (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  try {
    await page.goto(SITE + "/staff/login", { waitUntil: "networkidle" });
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL((u) => u.pathname === "/staff" || u.pathname === "/staff/change-password", { timeout: 30000 });

    // landing: cards + search
    await page.goto(SITE + "/staff/settings", { waitUntil: "networkidle" });
    const cards = await page.locator(".staff-settings-card").count();
    const summary = await page.locator(".staff-settings-summary div").count();
    console.log("landing cards:", cards, "summary items:", summary);
    await page.fill(".staff-settings-search input", "booking");
    await page.waitForTimeout(300);
    console.log("filtered cards for 'booking':", await page.locator(".staff-settings-card").count());
    await page.fill(".staff-settings-search input", "zzz-no-match");
    await page.waitForTimeout(300);
    console.log("empty-state visible:", await page.locator(".staff-empty h2").innerText().catch(() => "none"));

    // appointments form: fields + dirty protection attrs
    await page.goto(SITE + "/staff/settings/appointments", { waitUntil: "networkidle" });
    console.log("appt inputs:", await page.locator("input,select").count(), "save btn:", await page.getByRole("button", { name: /save/i }).count());
    const names = await page.locator("input[name],select[name]").evaluateAll((els) => els.map((e) => e.name));
    console.log("fields:", names.join(","));

    // roles page: permission chips
    await page.goto(SITE + "/staff/settings/roles", { waitUntil: "networkidle" });
    console.log("role sections:", await page.locator(".staff-editor-section").count(), "perm items:", await page.locator(".staff-roles-group li").count());

    // facilities page table
    await page.goto(SITE + "/staff/settings/facilities", { waitUntil: "networkidle" });
    console.log("facility rows:", await page.locator(".staff-table tbody tr").count());

    console.log("failed requests:", failed.length ? failed.slice(0, 10) : "none");
  } finally {
    await browser.close();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
