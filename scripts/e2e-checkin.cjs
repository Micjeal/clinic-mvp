const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const envPath = path.join(__dirname, "..", "apps", "web", ".env.local");
let env = fs.readFileSync(envPath, "utf8");
if (env.charCodeAt(0) === 0xfeff) env = env.slice(1);
const get = (k) => { const m = env.match(new RegExp("^" + k + "=([^\\r\\n]*)", "m")); return m ? m[1].trim() : null; };
const url = get("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = get("SUPABASE_SECRET_KEY");
const SITE = "https://hospica.vercel.app";
const APPT = "55e22d54-3c6b-4f1c-93f9-2dd6ae85a954";
const adminHeaders = { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json", Prefer: "return=representation" };

async function admin(p, o = {}) {
  const r = await fetch(url + "/rest/v1/" + p, { ...o, headers: { ...adminHeaders, ...(o.headers || {}) } });
  const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b };
}
async function adminAuth(p, o = {}) {
  const r = await fetch(url + "/auth/v1/" + p, { ...o, headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json" } });
  const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b };
}

async function main() {
  const appt = (await admin(`appointments?id=eq.${APPT}&select=id,organization_id,facility_id,status`)).body[0];
  const role = (await admin(`roles?role_key=eq.receptionist&select=id`)).body[0];
  const email = `e2e-recep-${Date.now()}@example.com`;
  const password = "E2ePass!" + Date.now();
  const cu = await adminAuth("admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  const userId = cu.body.id;
  console.log("test user:", userId, email);
  await admin("profiles", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ id: userId, full_name: "E2E Reception", professional_title: "Receptionist", status: "active" }) });
  const mem = await admin("staff_memberships", { method: "POST", body: JSON.stringify({ user_id: userId, organization_id: appt.organization_id, role_id: role.id, primary_facility_id: appt.facility_id, must_change_password: false, is_active: true }) });
  const membershipId = mem.body?.[0]?.id;
  console.log("membership:", membershipId);

  let browser;
  try {
    browser = await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    browser = await chromium.launch({ headless: true });
  }
  const page = await browser.newPage();
  page.on("console", (m) => { if (m.type() === "error") console.log("[console.error]", m.text().slice(0, 300)); });
  page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 300)));

  try {
    // Login
    await page.goto(SITE + "/staff/login", { waitUntil: "networkidle" });
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL((u) => u.pathname === "/staff" || u.pathname === "/staff/change-password", { timeout: 30000 }).catch(() => console.log("login did not redirect; url=", page.url()));
    await page.waitForLoadState("networkidle");
    console.log("after login url:", page.url());
    const loginErr = await page.locator(".staff-form-message--error, .form-error, [role=alert]").allTextContents().catch(() => []);
    if (loginErr.length) console.log("LOGIN ERRORS:", loginErr);

    // Appointment detail -> Check in
    await page.goto(`${SITE}/staff/appointments/${APPT}`, { waitUntil: "networkidle" });
    const bodyText = await page.locator("body").innerText();
    console.log("appt page has 'Check in':", /Check in/i.test(bodyText), "| status area:", (bodyText.match(/confirmed|checked_in|in progress|completed/gi) || []).join(","));
    const checkInBtn = page.getByRole("button", { name: /^Check in$/i }).first();
    if (await checkInBtn.count()) {
      await checkInBtn.click();
      await page.waitForTimeout(4000);
      const msgs = await page.locator(".staff-form-message, .form-error, .form-success, [role=alert], [role=status]").allTextContents().catch(() => []);
      console.log("after check-in messages:", JSON.stringify(msgs));
      const enc = await admin(`encounters?appointment_id=eq.${APPT}&select=id,status`);
      const que = enc.body?.[0] ? await admin(`queue_entries?encounter_id=eq.${enc.body[0].id}&select=id,status,priority`) : { body: [] };
      console.log("DB encounters:", JSON.stringify(enc.body), "queue:", JSON.stringify(que.body));
      const t2 = await page.locator("body").innerText();
      console.log("status now shows:", (t2.match(/checked in|in progress|confirmed|completed/gi) || []).slice(0, 6).join(" | "));
    } else {
      console.log("NO Check in button found. Buttons:", await page.locator("button").allTextContents());
    }

    // Queue + triage pages
    for (const p of ["/staff/queue", "/staff/triage", "/staff/reception"]) {
      await page.goto(SITE + p, { waitUntil: "networkidle" });
      const t = await page.locator("body").innerText();
      const hasPatient = /E2E|patient/i.test(t);
      console.log(`PAGE ${p}: len=${t.length} mentions patient/queue content:`, t.slice(0, 400).replace(/\n+/g, " | ").slice(0, 400));
    }
  } finally {
    await browser.close();
    // cleanup
    const enc = await admin(`encounters?appointment_id=eq.${APPT}&select=id`);
    for (const e of enc.body || []) {
      await admin(`queue_entries?encounter_id=eq.${e.id}`, { method: "DELETE" });
      await admin(`encounters?id=eq.${e.id}`, { method: "DELETE" });
    }
    await admin(`appointments?id=eq.${APPT}`, { method: "PATCH", body: JSON.stringify({ status: "confirmed" }) });
    if (membershipId) await admin(`staff_memberships?id=eq.${membershipId}`, { method: "DELETE" });
    await admin(`profiles?id=eq.${userId}`, { method: "DELETE" });
    await adminAuth(`admin/users/${userId}`, { method: "DELETE" });
    console.log("cleanup done");
  }
}
main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
