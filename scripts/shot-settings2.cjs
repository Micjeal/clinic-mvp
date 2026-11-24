const fs=require("fs"),path=require("path");
const {chromium}=require("playwright");
const envPath=path.join(__dirname,"..","apps","web",".env.local");
let env=fs.readFileSync(envPath,"utf8");
if(env.charCodeAt(0)===0xfeff)env=env.slice(1);
const get=k=>{const m=env.match(new RegExp("^"+k+"=([^\r\n]*)","m"));return m?m[1].trim():null};
const url=get("NEXT_PUBLIC_SUPABASE_URL"),serviceKey=get("SUPABASE_SECRET_KEY");
const SITE="http://localhost:3000";
const H={apikey:serviceKey,Authorization:"Bearer "+serviceKey,"Content-Type":"application/json",Prefer:"return=representation"};
const A=async(p,o={})=>{const r=await fetch(url+"/rest/v1/"+p,{...o,headers:{...H,...(o.headers||{})}});const t=await r.text();try{return JSON.parse(t)}catch{return t}};
const AU=async(p,o={})=>{const r=await fetch(url+"/auth/v1/"+p,{...o,headers:{apikey:serviceKey,Authorization:"Bearer "+serviceKey,"Content-Type":"application/json"}});const t=await r.text();try{return JSON.parse(t)}catch{return t}};
(async()=>{
  const appt=(await A(`appointments?select=organization_id,facility_id&limit=1`))[0];
  const role=(await A(`roles?role_key=eq.organization_admin&select=id`))[0];
  const email=`e2e-sp-${Date.now()}@example.com`,password="E2ePass!"+Date.now();
  const cu=await AU("admin/users",{method:"POST",body:JSON.stringify({email,password,email_confirm:true})});
  await A("profiles",{method:"POST",headers:{Prefer:"resolution=merge-duplicates"},body:JSON.stringify({id:cu.id,full_name:"Space Check",status:"active"})});
  await A("staff_memberships",{method:"POST",body:JSON.stringify({user_id:cu.id,organization_id:appt.organization_id,role_id:role.id,primary_facility_id:appt.facility_id,must_change_password:false,is_active:true})});
  const b=await chromium.launch({channel:"chrome",headless:true}).catch(()=>chromium.launch({headless:true}));
  const pg=await b.newPage({viewport:{width:1440,height:900}});
  await pg.goto(SITE+"/staff/login",{waitUntil:"networkidle"});
  await pg.fill('input[name="email"]',email);await pg.fill('input[name="password"]',password);
  await pg.getByRole("button",{name:/sign in/i}).click();
  await pg.waitForURL(u=>u.pathname==="/staff"||u.pathname==="/staff/change-password",{timeout:30000});
  for(const [n,p] of [["security","/staff/settings/security"],["clinical","/staff/settings/clinical"],["roles","/staff/settings/roles"],["audit","/staff/settings/audit"]]){
    await pg.goto(SITE+p,{waitUntil:"networkidle"});await pg.waitForTimeout(400);
    const gaps=await pg.evaluate(()=>{
      const panels=[...document.querySelectorAll('.staff-page .staff-panel')];
      return panels.slice(1).map(el=>Math.round(el.getBoundingClientRect().top-panels_prev.bottom));
    }).catch(()=>null);
    const mt=await pg.evaluate(()=>{const ps=[...document.querySelectorAll('.staff-page .staff-panel')];return ps.length>1?getComputedStyle(ps[1]).marginTop:"n/a"});
    console.log(n,"panels:",await pg.locator('.staff-page .staff-panel').count(),"2nd margin-top:",mt);
    await pg.screenshot({path:`shots-settings/space-${n}.png`,fullPage:true});
  }
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
