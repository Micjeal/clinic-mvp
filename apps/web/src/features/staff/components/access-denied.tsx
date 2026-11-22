import {ShieldAlert} from "lucide-react";
import Link from "next/link";
import {staffSignOutAction} from "@/server/actions/staff-auth.actions";

export function StaffAccessDenied(){return <div className="staff-surface staff-access-page"><section className="staff-access-card" aria-labelledby="staff-access-title"><span className="staff-access-icon"><ShieldAlert aria-hidden="true" /></span><p className="eyebrow">Staff portal</p><h1 id="staff-access-title">Access denied</h1><p>This account does not have permission to access appointment operations.</p><div className="staff-access-actions"><Link className="btn" href="/">Return to clinic website</Link><form action={staffSignOutAction}><button className="btn btn-secondary" type="submit">Sign out</button></form></div></section></div>;}
