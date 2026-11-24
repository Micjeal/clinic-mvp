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
const adminHeaders = { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json", Prefer: "return=representation" };
async function admin(p, o = {}) { const r = await fetch(url + "/rest/v1/" + p, { ...o, headers: { ...adminHeaders, ...(o.headers || {}) } }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; }
async function adminAuth(p, o = {}) { const r = await fetch(url + "/auth/v1/" + p, { ...o, headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json" } }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; }

async function main() {
  const appt = (await admin(`appointments?select=organization_id,facility_id&limit=1`)).body[0];
  const role = (await admin(`roles?role_key=eq.organization_admin&select=id`)).body[0];
  const email = `e2e-audit-${Date.now()}@example.com`;
  const password = "E2ePass!" + Date.now();
  const cu = await adminAuth("admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  await admin("profiles", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ id: cu.body.id, full_name: "Audit User", status: "active" }) });
  await admin("staff_memberships", { method: "POST", body: JSON.stringify({ user_id: cu.body.id, organization_id: appt.organization_id, role_id: role.id, primary_facility_id: appt.facility_id, must_change_password: false, is_active: true }) });

  const browser = await chromium.launch({ channel: "chrome", headless: true }).catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(SITE + "/staff/login", { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((u) => u.pathname === "/staff" || u.pathname === "/staff/change-password", { timeout: 30000 });

  const audit = async (label) => {
    const r = await page.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const rect = (el) => el ? el.getBoundingClientRect() : null;
      const kpis = [...document.querySelectorAll(".staff-kpi")];
      const kpiCols = kpis.length ? getComputedStyle(document.querySelector(".staff-kpi-grid")).gridTemplateColumns.split(" ").length : 0;
      const dash = q(".staff-dash-grid");
      const main = q(".staff-dash-main"), side = q(".staff-dash-side");
      const mr = rect(main), sr = rect(side);
      const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
      return {
        kpis: kpis.length, kpiCols,
        kpiLabels: kpis.map(k => k.querySelector(".staff-kpi__top span")?.textContent),
        dashCols: dash ? getComputedStyle(dash).gridTemplateColumns.split(" ").length : 0,
        sideBelow: mr && sr ? sr.top >= mr.bottom - 4 || sr.left >= mr.right - 4 : null,
        panels: document.querySelectorAll(".staff-dash-panel").length,
        quickActions: document.querySelectorAll(".staff-quick-action").length,
        statStrip: document.querySelectorAll(".staff-stat").length,
        hOverflow: overflow,
        vw: document.documentElement.clientWidth,
        sw: document.documentElement.scrollWidth,
      };
    });
    console.log(label, JSON.stringify(r));
  };

  for (const w of [1440, 1280, 768, 390]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto(SITE + "/staff", { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    await audit(`dashboard@${w}`);
  }
  for (const [name, p] of [["departments", "/staff/departments"], ["services", "/staff/services"], ["facilities", "/staff/facilities"], ["appointments", "/staff/appointments"], ["queue", "/staff/queue"]]) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(SITE + p, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    await audit(`${name}@1440`);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(SITE + p, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    await audit(`${name}@390`);
  }
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
