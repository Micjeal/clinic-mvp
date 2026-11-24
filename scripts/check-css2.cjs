const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await b.newPage();
  await p.goto("http://localhost:3000/staff/login", { waitUntil: "networkidle" });
  const r = await p.evaluate(() => {
    let count = 0; const samples = [];
    for (const sheet of document.styleSheets) {
      try {
        const walk = (rules) => { for (const rule of rules) { if (rule.cssRules) walk(rule.cssRules); else if (rule.style && rule.style.backdropFilter) { count++; if (samples.length < 5) samples.push(rule.cssText.slice(0,160)); } } };
        walk(sheet.cssRules);
      } catch {}
    }
    return { count, samples };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
