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
  const email = `e2e-sb-${Date.now()}@example.com`;
  const password = "E2ePass!" + Date.now();
  const cu = await adminAuth("admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  await admin("profiles", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ id: cu.body.id, full_name: "Sidebar Check", status: "active" }) });
  await admin("staff_memberships", { method: "POST", body: JSON.stringify({ user_id: cu.body.id, organization_id: appt.organization_id, role_id: role.id, primary_facility_id: appt.facility_id, must_change_password: false, is_active: true }) });
  const browser = await chromium.launch({ channel: "chrome", headless: true }).catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(SITE + "/staff/login", { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((u) => u.pathname === "/staff" || u.pathname === "/staff/change-password", { timeout: 30000 });
  await page.goto(SITE + "/staff", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => {
    const sb = document.querySelector(".staff-sidebar");
    const sc = document.querySelector(".staff-sidebar-scroll");
    const bottom = document.querySelector(".staff-sidebar-bottom");
    const signout = document.querySelector(".staff-signout");
    const nav = document.querySelector(".staff-nav a");
    const label = document.querySelector(".staff-nav-label--group");
    const active = document.querySelector(".staff-nav a.is-active");
    const r = (el) => el ? el.getBoundingClientRect() : null;
    const cs = (el, p) => el ? getComputedStyle(el)[p] : null;
    return {
      sidebarH: Math.round(r(sb)?.height), vh: innerHeight,
      sidebarPos: cs(sb, "position"), display: cs(sb, "display"),
      scrollOverflowY: cs(sc, "overflowY"), scrollFlex: cs(sc, "flex"),
      scrollbarW: cs(sc, "scrollbarWidth"),
      bottomBorderTop: cs(bottom, "borderTopWidth"),
      signoutBottomGap: Math.round(innerHeight - r(signout).bottom),
      signoutVisible: r(signout).bottom <= innerHeight && r(signout).top >= 0,
      navPad: cs(nav, "padding"), navMinH: cs(nav, "minHeight"),
      navRadius: cs(nav, "borderRadius"),
      hoverBgTest: null,
      activeBg: cs(active, "backgroundColor"), activeColor: cs(active, "color"),
      activeIcon: cs(active?.querySelector("svg"), "color"),
      labelSize: cs(label, "fontSize"), labelColor: cs(label, "color"),
      cols: getComputedStyle(document.querySelector(".staff-shell")).gridTemplateColumns,
    };
  });
  console.log("expanded:", JSON.stringify(m, null, 1));
  await page.click(".staff-collapse-button");
  await page.waitForTimeout(450);
  const c = await page.evaluate(() => {
    const shell = document.querySelector(".staff-shell");
    const nav = document.querySelector(".staff-nav a");
    const r = nav.getBoundingClientRect();
    const sb = document.querySelector(".staff-sidebar").getBoundingClientRect();
    const label = document.querySelector(".staff-nav-label--group");
    return {
      cols: getComputedStyle(shell).gridTemplateColumns,
      sidebarW: Math.round(sb.width),
      iconCenterOffset: Math.round(r.left + r.width / 2 - sb.left),
      sidebarMid: Math.round(sb.width / 2),
      labelFontSize: getComputedStyle(label).fontSize,
      navTitle: nav.getAttribute("title"),
    };
  });
  console.log("collapsed:", JSON.stringify(c, null, 1));
  await page.screenshot({ path: "shots-admin-after/sidebar-refined.png" });
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
