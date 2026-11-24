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
  const email = `e2e-m-${Date.now()}@example.com`;
  const password = "E2ePass!" + Date.now();
  const cu = await adminAuth("admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  await admin("profiles", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ id: cu.body.id, full_name: "Measure", status: "active" }) });
  await admin("staff_memberships", { method: "POST", body: JSON.stringify({ user_id: cu.body.id, organization_id: appt.organization_id, role_id: role.id, primary_facility_id: appt.facility_id, must_change_password: false, is_active: true }) });
  const browser = await chromium.launch({ channel: "chrome", headless: true }).catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(SITE + "/staff/login", { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((u) => u.pathname === "/staff" || u.pathname === "/staff/change-password", { timeout: 30000 });
  for (const w of [1440, 1280]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto(SITE + "/staff", { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const res = [];
      document.querySelectorAll(".staff-dash-panel .staff-dashboard-table").forEach((wrap, i) => {
        const table = wrap.querySelector("table");
        const panel = wrap.closest(".staff-panel");
        const wr = wrap.getBoundingClientRect(), pr = panel.getBoundingClientRect(), tr = table.getBoundingClientRect();
        const firstTh = table.querySelector("thead th");
        const ftr = firstTh.getBoundingClientRect();
        // status pill overflow check
        let pillOverflow = 0;
        table.querySelectorAll(".status").forEach(s => {
          const sr = s.getBoundingClientRect(), parent = s.closest("td").getBoundingClientRect();
          if (sr.right > parent.right + 1 || sr.left < parent.left - 1) pillOverflow++;
        });
        res.push({
          table: i,
          wrapW: Math.round(wr.width), wrapScrollW: wrap.scrollWidth, wrapClientW: wrap.clientWidth,
          tableW: Math.round(tr.width), panelInnerW: Math.round(pr.width),
          firstThLeftOffset: Math.round(ftr.left - wr.left),
          tableLeftVsWrap: Math.round(tr.left - wr.left),
          tableRightVsWrap: Math.round(tr.right - wr.right),
          pillOverflow,
          cols: [...table.querySelectorAll("thead th")].map(th => th.textContent.trim()),
        });
      });
      return res;
    });
    console.log("viewport", w, JSON.stringify(r, null, 1));
  }
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
