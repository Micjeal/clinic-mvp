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
  const email = `e2e-dt-${Date.now()}@example.com`;
  const password = "E2ePass!" + Date.now();
  const cu = await adminAuth("admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  await admin("profiles", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ id: cu.body.id, full_name: "Dept Table", status: "active" }) });
  await admin("staff_memberships", { method: "POST", body: JSON.stringify({ user_id: cu.body.id, organization_id: appt.organization_id, role_id: role.id, primary_facility_id: appt.facility_id, must_change_password: false, is_active: true }) });
  const browser = await chromium.launch({ channel: "chrome", headless: true }).catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(SITE + "/staff/login", { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((u) => u.pathname === "/staff" || u.pathname === "/staff/change-password", { timeout: 30000 });
  await page.goto(SITE + "/staff/departments", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => {
    const table = document.querySelector(".staff-departments-table");
    if (!table) return { error: "table not found" };
    const wrap = table.closest(".staff-panel-table-wrap");
    const ths = [...table.querySelectorAll("thead th")].map(th => ({ t: th.textContent.trim(), w: Math.round(th.getBoundingClientRect().width) }));
    const firstRow = table.querySelector("tbody tr");
    const tds = firstRow ? [...firstRow.querySelectorAll("td")].map(td => Math.round(td.getBoundingClientRect().width)) : [];
    const badges = firstRow ? [...firstRow.querySelectorAll(".staff-catalog-badges > span")].map(b => { const r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; }) : [];
    const badgeWrap = firstRow?.querySelector(".staff-catalog-badges");
    const badgeGap = badgeWrap ? getComputedStyle(badgeWrap).gap : null;
    const sub = firstRow?.querySelector(".staff-row-substatus");
    const strong = firstRow?.querySelector(".staff-departments-name > strong");
    const subGap = sub && strong ? Math.round(sub.getBoundingClientRect().top - strong.getBoundingClientRect().bottom) : null;
    return {
      wrapScrollW: wrap.scrollWidth, wrapClientW: wrap.clientWidth,
      tableW: Math.round(table.getBoundingClientRect().width),
      hOverflow: wrap.scrollWidth > wrap.clientWidth + 1,
      ths, tds, badges, badgeGap, subGap,
      subSize: sub ? getComputedStyle(sub).fontSize : null,
      strongWeight: strong ? getComputedStyle(strong).fontWeight : null,
    };
  });
  console.log(JSON.stringify(m, null, 1));
  await page.screenshot({ path: "shots-admin-after/departments-table.png", fullPage: false });
  // mobile check
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const mob = await page.evaluate(() => {
    const wrap = document.querySelector(".staff-panel-table-wrap");
    return { hOverflow: wrap.scrollWidth > wrap.clientWidth + 1, scrollW: wrap.scrollWidth, clientW: wrap.clientWidth };
  });
  console.log("mobile:", JSON.stringify(mob));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
