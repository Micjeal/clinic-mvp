const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const envPath = path.join(__dirname, "..", "apps", "web", ".env.local");
let env = fs.readFileSync(envPath, "utf8");
if (env.charCodeAt(0) === 0xfeff) env = env.slice(1);
const get = (k) => { const m = env.match(new RegExp("^" + k + "=([^\r\n]*)", "m")); return m ? m[1].trim() : null; };
const url = get("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = get("SUPABASE_SECRET_KEY");
const SITE = process.argv[2] || "http://localhost:3000";
const OUT = process.argv[3] || "shots-settings";
const adminHeaders = { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json", Prefer: "return=representation" };
async function admin(p, o = {}) { const r = await fetch(url + "/rest/v1/" + p, { ...o, headers: { ...adminHeaders, ...(o.headers || {}) } }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; }
async function adminAuth(p, o = {}) { const r = await fetch(url + "/auth/v1/" + p, { ...o, headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json" } }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; }

const PAGES = [
  ["landing", "/staff/settings"],
  ["organization", "/staff/settings/organization"],
  ["general", "/staff/settings/general"],
  ["appointments", "/staff/settings/appointments"],
  ["notifications", "/staff/settings/notifications"],
  ["branding", "/staff/settings/branding"],
  ["security", "/staff/settings/security"],
  ["roles", "/staff/settings/roles"],
  ["users", "/staff/settings/users"],
  ["facilities", "/staff/settings/facilities"],
  ["localization", "/staff/settings/localization"],
  ["audit", "/staff/settings/audit"],
];

async function main() {
  const appt = (await admin(`appointments?select=organization_id,facility_id&limit=1`)).body[0];
  const role = (await admin(`roles?role_key=eq.organization_admin&select=id`)).body[0];
  const email = `e2e-settings-${Date.now()}@example.com`;
  const password = "E2ePass!" + Date.now();
  const cu = await adminAuth("admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  const userId = cu.body.id;
  await admin("profiles", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ id: userId, full_name: "Settings Review", status: "active" }) });
  await admin("staff_memberships", { method: "POST", body: JSON.stringify({ user_id: userId, organization_id: appt.organization_id, role_id: role.id, primary_facility_id: appt.facility_id, must_change_password: false, is_active: true }) });
  console.log("user ready");

  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true }).catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  try {
    await page.goto(SITE + "/staff/login", { waitUntil: "networkidle" });
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL((u) => u.pathname === "/staff" || u.pathname === "/staff/change-password", { timeout: 30000 });

    for (const [name, pagePath] of PAGES) {
      const resp = await page.goto(SITE + pagePath, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);
      const title = await page.locator("h1, h2").first().innerText().catch(() => "?");
      console.log(`${name}: ${resp?.status()} "${title.trim().slice(0, 50)}"`);
      await page.screenshot({ path: path.join(OUT, `${name}-desktop.png`), fullPage: true });
    }
    // tablet + mobile on landing and one form page
    for (const [w, h, tag] of [[820, 1180, "tablet"], [390, 844, "mobile"]]) {
      await page.setViewportSize({ width: w, height: h });
      for (const [name, pagePath] of [["landing", "/staff/settings"], ["appointments", "/staff/settings/appointments"]]) {
        await page.goto(SITE + pagePath, { waitUntil: "networkidle" });
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(OUT, `${name}-${tag}.png`), fullPage: true });
      }
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log("mobile h-overflow px:", overflow);
  } finally {
    if (errors.length) console.log("PAGE ERRORS:", errors.slice(0, 10));
    await browser.close();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
