import {Activity,CalendarCheck2,CalendarDays,CheckCircle2,Clock3,ClipboardList,Hourglass,UserRoundCheck} from "lucide-react";
import Link from "next/link";
import {AttentionAppointments,RecentRequests,TodayAppointments} from "@/features/staff/components/dashboard-sections";
import {StaffPageHeader} from "@/features/staff/components/staff-content";
import {getStaffDashboard} from "@/server/services/staff-dashboard.service";
import {getStaffPortalContext} from "@/server/services/staff-portal.service";

export const metadata={title:"Staff dashboard"};

export default async function StaffDashboardPage(){
  const context=await getStaffPortalContext(),dashboard=await getStaffDashboard(context.timezone);
  const hour=new Intl.DateTimeFormat("en-GB",{hour:"numeric",hour12:false,timeZone:context.timezone}).format(new Date()),greeting=Number(hour)<12?"Good morning":Number(hour)<18?"Good afternoon":"Good evening";
  const metricIcons=[ClipboardList,CalendarDays,CalendarCheck2,UserRoundCheck,Clock3,Activity,CheckCircle2,Hourglass,Activity];
  const metricTones:Record<string,string>={"Today's appointments":"teal","New requests":"amber","Scheduled":"blue","Confirmed":"green","Checked in":"cyan","In progress":"violet","Completed today":"emerald","Cancelled":"rose","No-show":"orange"};
  return <div className="staff-page"><StaffPageHeader eyebrow="Organization overview" title={`${greeting}, ${context.name.split(" ")[0]}`} description="Here's what needs attention today." context={<div className="staff-page-heading__context"><span>Organization</span><strong>{context.organization}</strong></div>} />
    <section aria-label="Appointment summary" className="staff-metrics-grid">{dashboard.metrics.map((metric,index)=>{const Icon=metricIcons[index]??Activity;return <article className={`staff-metric staff-metric--${metricTones[metric.label]??"teal"}`} key={metric.label}><div className="staff-metric__top"><span>{metric.label}</span><span className="staff-metric__icon"><Icon aria-hidden="true" /></span></div><strong>{metric.value}</strong>{metric.label==="New requests"?<Link href="/staff/appointments?status=requested">Needs review <span aria-hidden="true">→</span></Link>:null}</article>;})}</section>
    <div className="staff-dashboard-sections"><AttentionAppointments items={dashboard.attention} timeZone={context.timezone}/><TodayAppointments items={dashboard.today} timeZone={context.timezone}/><RecentRequests items={dashboard.recent} timeZone={context.timezone}/></div>
  </div>;
}
