const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await b.newPage();
  await p.goto("http://localhost:3000/staff/login", { waitUntil: "domcontentloaded" });
  const r = await p.evaluate(() => {
    const el = document.createElement("div");
    el.style.backdropFilter = "blur(10px)";
    document.body.appendChild(el);
    const v = getComputedStyle(el).backdropFilter;
    el.remove();
    return v;
  });
  console.log("sanity backdrop-filter support:", r);
  await b.close();
})();
