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
const adminHeaders = { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json", Prefer: "return=representation" };
async function admin(p, o = {}) { const r = await fetch(url + "/rest/v1/" + p, { ...o, headers: { ...adminHeaders, ...(o.headers || {}) } }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; }
async function adminAuth(p, o = {}) { const r = await fetch(url + "/auth/v1/" + p, { ...o, headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json" } }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; }

async function main() {
  const appt = (await admin(`appointments?select=organization_id,facility_id&limit=1`)).body[0];
  const role = (await admin(`roles?role_key=eq.organization_admin&select=id`)).body[0];
  const email = `e2e-dom-${Date.now()}@example.com`;
  const password = "E2ePass!" + Date.now();
  const cu = await adminAuth("admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  const userId = cu.body.id;
  await admin("profiles", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ id: userId, full_name: "Test User", status: "active" }) });
  await admin("staff_memberships", { method: "POST", body: JSON.stringify({ user_id: userId, organization_id: appt.organization_id, role_id: role.id, primary_facility_id: appt.facility_id, must_change_password: false, is_active: true }) });

  const browser = await chromium.launch({ channel: "chrome", headless: true }).catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(SITE + "/staff/login", { waitUntil: "networkidle" });
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL((u) => u.pathname === "/staff" || u.pathname === "/staff/change-password", { timeout: 30000 });
    await page.waitForLoadState("networkidle");

    const info = await page.evaluate(() => {
      const groups = [...document.querySelectorAll(".staff-nav__group")].map((g) => ({
        label: g.querySelector(".staff-nav-label--group")?.textContent ?? null,
        links: [...g.querySelectorAll("a")].map((a) => ({ text: a.textContent.trim(), active: a.classList.contains("is-active") })),
      }));
      const activeLink = document.querySelector(".staff-nav a.is-active");
      const cs = activeLink ? getComputedStyle(activeLink) : null;
      const sidebar = document.querySelector(".staff-sidebar");
      const scs = sidebar ? getComputedStyle(sidebar) : null;
      return {
        groupCount: groups.length,
        groups,
        activeBg: cs?.backgroundImage?.slice(0, 80),
        activeColor: cs?.color,
        sidebarBg: scs?.backgroundImage?.slice(0, 100),
        hasBefore: !!sidebar && getComputedStyle(sidebar, "::before").content !== "none",
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    console.log(JSON.stringify(info, null, 1));

    // collapsed
    await page.click(".staff-collapse-button");
    await page.waitForTimeout(400);
    const collapsed = await page.evaluate(() => ({
      width: document.querySelector(".staff-sidebar")?.getBoundingClientRect().width,
      visibleLabels: [...document.querySelectorAll(".staff-nav-label--group")].filter((el) => el.getBoundingClientRect().width > 4).length,
      linkCount: document.querySelectorAll(".staff-nav a").length,
    }));
    console.log("collapsed:", JSON.stringify(collapsed));
    await page.click(".staff-collapse-button");

    // mobile drawer
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(SITE + "/staff/queue", { waitUntil: "networkidle" });
    await page.click(".staff-menu-button");
    await page.waitForTimeout(500);
    const drawer = await page.evaluate(() => {
      const d = document.querySelector(".staff-drawer");
      const r = d?.getBoundingClientRect();
      return { open: d?.getAttribute("aria-hidden") === "false", x: r?.x, width: r?.width, groups: d?.querySelectorAll(".staff-nav__group").length };
    });
    console.log("drawer:", JSON.stringify(drawer));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    const afterEsc = await page.evaluate(() => document.querySelector(".staff-drawer")?.getAttribute("aria-hidden"));
    console.log("after Escape aria-hidden:", afterEsc);
  } finally {
    await browser.close();
    const m = await admin(`staff_memberships?user_id=eq.${userId}&select=id`);
    for (const x of m.body || []) await admin(`staff_memberships?id=eq.${x.id}`, { method: "DELETE" });
    await admin(`profiles?id=eq.${userId}`, { method: "DELETE" });
    await adminAuth(`admin/users/${userId}`, { method: "DELETE" });
    console.log("cleanup done");
  }
}
main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
