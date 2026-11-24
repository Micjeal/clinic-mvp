const { chromium } = require("playwright");
(async()=>{
 const SITE="https://hospica.vercel.app";
 const browser=await chromium.launch({channel:"chrome",headless:true}).catch(()=>chromium.launch({headless:true}));
 const page=await browser.newPage();
 const widths=[390,768,900,1440];
 for(const w of widths){
  await page.setViewportSize({width:w,height:844});
  for(const path of ["/","/login","/staff/login","/portal"]){
   try{
    const resp=await page.goto(SITE+path,{waitUntil:"domcontentloaded",timeout:30000});
    await page.waitForTimeout(1200);
    const m=await page.evaluate(()=>({ox:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
    console.log(`${w}px ${path} -> HTTP ${resp?.status()} overflowX=${m.ox} (${m.sw}/${m.cw})`);
   }catch(e){console.log(`${w}px ${path} -> NAV FAIL ${e.message.slice(0,80)}`)}
  }
 }
 await browser.close();
})();
