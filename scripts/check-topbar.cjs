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
const H = { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json", Prefer: "return=representation" };
async function admin(p, o = {}) { const r = await fetch(url + "/rest/v1/" + p, { ...o, headers: { ...H, ...(o.headers || {}) } }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; }
async function adminAuth(p, o = {}) { const r = await fetch(url + "/auth/v1/" + p, { ...o, headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json" } }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; }
async function main() {
  const appt = (await admin(`appointments?select=organization_id,facility_id&limit=1`)).body[0];
  const role = (await admin(`roles?role_key=eq.organization_admin&select=id`)).body[0];
  const email = `e2e-tb-${Date.now()}@example.com`;
  const password = "E2ePass!" + Date.now();
  const cu = await adminAuth("admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  await admin("profiles", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ id: cu.body.id, full_name: "Topbar Test", status: "active" }) });
  await admin("staff_memberships", { method: "POST", body: JSON.stringify({ user_id: cu.body.id, organization_id: appt.organization_id, role_id: role.id, primary_facility_id: appt.facility_id, must_change_password: false, is_active: true }) });
  const browser = await chromium.launch({ channel: "chrome", headless: true }).catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(SITE + "/staff/login", { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((u) => u.pathname === "/staff" || u.pathname === "/staff/change-password", { timeout: 30000 });
  await page.goto(SITE + "/staff/departments", { waitUntil: "networkidle" });
  const m = await page.evaluate(() => {
    const tb = document.querySelector(".staff-topbar");
    const cs = (el, p) => el ? getComputedStyle(el)[p] : null;
    const date = document.querySelector(".staff-date");
    const trig = document.querySelector(".staff-account-trigger");
    const av = document.querySelector(".staff-account-avatar");
    const eyebrow = document.querySelector(".staff-topbar__page span");
    const title = document.querySelector(".staff-topbar__page strong");
    return {
      pos: cs(tb, "position"), top: cs(tb, "top"), z: cs(tb, "zIndex"),
      bg: cs(tb, "backgroundColor"), blur: cs(tb, "backdropFilter"),
      borderBottom: cs(tb, "borderBottomWidth"), padding: cs(tb, "padding"),
      dateDisplay: cs(date, "display"), dateRadius: cs(date, "borderRadius"), dateBg: cs(date, "backgroundColor"), hasIcon: !!date.querySelector("svg"),
      trigRadius: cs(trig, "borderRadius"), trigBorder: cs(trig, "border"),
      avRadius: cs(av, "borderRadius"), avSize: av.getBoundingClientRect().width,
      eyebrowColor: cs(eyebrow, "color"), eyebrowSize: cs(eyebrow, "fontSize"),
      titleSize: cs(title, "fontSize"), titleFont: cs(title, "fontFamily").slice(0, 30),
    };
  });
  console.log(JSON.stringify(m, null, 1));
  // sticky check: scroll and see if topbar stays
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(200);
  const sticky = await page.evaluate(() => Math.round(document.querySelector(".staff-topbar").getBoundingClientRect().top));
  console.log("topbar top after scroll:", sticky);
  await page.screenshot({ path: "shots-admin-after/topbar-refined.png" });
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
