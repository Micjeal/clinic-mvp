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
  const dept = (await admin(`departments?select=id&limit=1`)).body[0];
  const fac = (await admin(`facilities?select=id&limit=1`)).body[0];
  const svc = (await admin(`services?select=id&limit=1`)).body[0];
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
      const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
      // cell overflow check: any td whose content is clipped horizontally
      const clipped = [...document.querySelectorAll(".staff-dashboard-table td, .staff-panel-table-wrap td")].filter(td => td.scrollWidth > td.clientWidth + 2).length;
      // overlap check inside recent appointments table: status chip vs sibling text
      let overlaps = 0;
      document.querySelectorAll(".staff-dashboard-table tr").forEach(tr => {
        const cells = [...tr.children];
        for (let i = 0; i < cells.length - 1; i++) {
          const a = cells[i].getBoundingClientRect(), b = cells[i + 1].getBoundingClientRect();
          if (a.right > b.left + 1 && a.width > 0 && b.width > 0) overlaps++;
        }
      });
      return {
        hOverflow: overflow, clippedCells: clipped, cellOverlaps: overlaps,
        statStrips: document.querySelectorAll(".staff-stat").length,
        formPage: !!document.querySelector(".staff-form-page"),
        editorCards: document.querySelectorAll(".staff-editor-section").length,
        vw: document.documentElement.clientWidth,
      };
    });
    console.log(label, JSON.stringify(r));
  };

  const pages = [
    ["dashboard", "/staff"], ["users", "/staff/users"], ["appointments", "/staff/appointments"],
    ["facilities", "/staff/facilities"], ["departments", "/staff/departments"], ["services", "/staff/services"],
    ["queue", "/staff/queue"], ["reception", "/staff/reception"],
    dept ? ["dept-detail", `/staff/departments/${dept.id}`] : null,
    fac ? ["fac-detail", `/staff/facilities/${fac.id}`] : null,
    svc ? ["svc-detail", `/staff/services/${svc.id}`] : null,
    ["dept-new", "/staff/departments/new"], ["fac-new", "/staff/facilities/new"], ["svc-new", "/staff/services/new"], ["user-new", "/staff/users/new"],
  ].filter(Boolean);

  for (const w of [1440, 390]) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const [name, p] of pages) {
      await page.goto(SITE + p, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);
      await audit(`${name}@${w}`);
    }
  }
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
