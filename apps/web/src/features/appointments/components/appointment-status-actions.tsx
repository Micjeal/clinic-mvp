"use client";

import {useActionState,useEffect,useId,useRef} from "react";
import {useFormStatus} from "react-dom";
import {appointmentTransitionLabel,allowedStatusTransitions,destructiveAppointmentTransitions} from "@clinic/shared";
import {updateAppointmentStatusAction} from "@/server/actions/staff-appointment.actions";

function Submit({status}:{status:string}){const {pending}=useFormStatus();return <button className={`btn${destructiveAppointmentTransitions.has(status)?" btn-danger":""}`} disabled={pending} type="submit">{pending?"Updating…":appointmentTransitionLabel(status)}</button>;}

function StatusAction({appointmentId,status}:{appointmentId:string;status:string}){
  const [state,action]=useActionState(updateAppointmentStatusAction.bind(null,appointmentId,status),null);
  const dialogRef=useRef<HTMLDialogElement>(null),titleId=useId(),destructive=destructiveAppointmentTransitions.has(status);
  useEffect(()=>{if(state?.success)dialogRef.current?.close();},[state?.success]);
  if(!destructive)return <form action={action} className="staff-action-form"><Submit status={status}/>{state?.error?<p className="staff-form-message staff-form-message--error" role="alert">{state.error}</p>:null}{state?.success?<p className="staff-form-message staff-form-message--success" role="status">{state.success}</p>:null}</form>;
  const noShow=status==="no_show";
  return <div className="staff-action-form"><button className="btn btn-danger" onClick={()=>dialogRef.current?.showModal()} type="button">{appointmentTransitionLabel(status)}</button>{state?.error?<p className="staff-form-message staff-form-message--error" role="alert">{state.error}</p>:null}{state?.success?<p className="staff-form-message staff-form-message--success" role="status">{state.success}</p>:null}<dialog aria-labelledby={titleId} className="staff-dialog" ref={dialogRef}><form action={action}><h2 id={titleId}>{noShow?"Mark patient as no-show?":"Cancel this appointment?"}</h2><p>{noShow?"Use this only if the patient did not attend the scheduled appointment.":"This appointment will be marked as cancelled."}</p><div className="staff-dialog__actions"><button className="btn btn-secondary" onClick={()=>dialogRef.current?.close()} type="button">{noShow?"Go back":"Keep appointment"}</button><Submit status={status}/></div></form></dialog></div>;
}

export function AppointmentStatusActions({appointmentId,currentStatus,canUpdate}:{appointmentId:string;currentStatus:string;canUpdate:boolean}){
  const transitions=allowedStatusTransitions[currentStatus]??[];
  if(!canUpdate||!transitions.length)return null;
  return <section className="staff-detail-actions" aria-labelledby="appointment-actions-title"><div><p className="eyebrow">Workflow</p><h2 id="appointment-actions-title">Update appointment</h2></div><div className="staff-detail-actions__buttons">{transitions.map(status=><StatusAction appointmentId={appointmentId} key={status} status={status}/>)}</div></section>;
}
