import {appointmentStatusLabel} from "@clinic/shared";

export function StatusChip({status}:{status:string}){return <span className={`status status--${status}`}>{appointmentStatusLabel(status)}</span>;}
