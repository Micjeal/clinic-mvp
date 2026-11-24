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
async function admin(p, o = {}) { const r = await fetch(url + "/rest/v1/" + p, { ...o, headers: { ...adminHeaders, ...(o.headers || {}) } }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; }
async function adminAuth(p, o = {}) { const r = await fetch(url + "/auth/v1/" + p, { ...o, headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json" } }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; }
async function main() {
  const appt = (await admin(`appointments?select=organization_id,facility_id&limit=1`)).body[0];
  const role = (await admin(`roles?role_key=eq.organization_admin&select=id`)).body[0];
  const email = `e2e-ov-${Date.now()}@example.com`;
  const password = "E2ePass!" + Date.now();
  const cu = await adminAuth("admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  await admin("profiles", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ id: cu.body.id, full_name: "Overlap Test", status: "active" }) });
  await admin("staff_memberships", { method: "POST", body: JSON.stringify({ user_id: cu.body.id, organization_id: appt.organization_id, role_id: role.id, primary_facility_id: appt.facility_id, must_change_password: false, is_active: true }) });
  const browser = await chromium.launch({ channel: "chrome", headless: true }).catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(SITE + "/staff/login", { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((u) => u.pathname === "/staff" || u.pathname === "/staff/change-password", { timeout: 30000 });
  await page.goto(SITE + "/staff", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const report = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll(".staff-dash-panel .staff-dashboard-table table.staff-table").forEach((table, ti) => {
      table.querySelectorAll("tbody tr").forEach((tr, ri) => {
        [...tr.children].forEach((td, ci) => {
          const kids = [...td.children];
          // measure each direct child vs cell
          kids.forEach(k => {
            const kr = k.getBoundingClientRect(), tr2 = td.getBoundingClientRect();
            if (kr.width > tr2.width + 2 || kr.right > tr2.right + 2) {
              out.push({ table: ti, row: ri, col: ci, tag: k.className || k.tagName, kidW: Math.round(kr.width), cellW: Math.round(tr2.width), text: (k.textContent || "").slice(0, 40) });
            }
          });
          // sibling overlap inside cell
          for (let i = 0; i < kids.length - 1; i++) {
            const a = kids[i].getBoundingClientRect(), b = kids[i + 1].getBoundingClientRect();
            if (a.right > b.left + 1 && a.bottom > b.top && a.top < b.bottom) out.push({ table: ti, row: ri, col: ci, overlap: kids[i].className + " vs " + kids[i + 1].className });
          }
        });
      });
    });
    return out.slice(0, 30);
  });
  console.log(JSON.stringify(report, null, 1));
  await page.screenshot({ path: "shots-admin-after/dashboard-1280-fixed.png", fullPage: true });
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
