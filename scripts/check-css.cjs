const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await b.newPage();
  await p.goto("http://localhost:3000/staff/login", { waitUntil: "networkidle" });
  const r = await p.evaluate(() => {
    const hits = [];
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.cssText && rule.cssText.includes("staff-topbar") && rule.cssText.includes("backdrop")) hits.push(rule.cssText.slice(0, 400));
        }
      } catch {}
    }
    return hits;
  });
  console.log(r.join("\n---\n") || "no matching rule found");
  await b.close();
})();
