"use client";

import {useActionState, useEffect, useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {
  assignDepartmentStaffAction,
  removeDepartmentStaffAction,
  saveDepartmentAction,
  saveFacilityAction,
  saveServiceAction,
  setDepartmentActiveAction,
  setDepartmentHeadAction,
  setFacilityActiveAction,
  setServiceActiveAction,
} from "@/server/actions/catalog.actions";
import {openingHoursToText} from "@/lib/opening-hours";

type ActionResult = {error?: string; success?: string; id?: string} | null;

function FormMessage({state}: {state: ActionResult}) {
  if (!state) return null;
  if (state.error) return <p className="form-error" role="alert">{state.error}</p>;
  if (state.success) return <p className="form-success" role="status">{state.success}</p>;
  return null;
}

function BoolField({name, label, defaultChecked, hint}: {name: string; label: string; defaultChecked?: boolean; hint?: string}) {
  return <label className="staff-catalog-check"><input defaultChecked={defaultChecked} name={name} type="checkbox" value="true" /><span><strong>{label}</strong>{hint ? <small>{hint}</small> : null}</span></label>;
}

/* --------------------------------- facilities --------------------------------- */

export type FacilityFormValues = {
  id?: string; name: string; code: string; facility_type: string;
  address_line: string | null; city: string | null; district: string | null; country_code: string;
  phone: string | null; email: string | null; timezone: string;
  is_public: boolean; is_active: boolean;
};

export function FacilityForm({facility}: {facility?: FacilityFormValues}) {
  const [state, action, pending] = useActionState(saveFacilityAction, null);
  const router = useRouter();
  useEffect(() => {
    if (state?.success && state.id && !facility?.id) router.push(`/staff/facilities/${state.id}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.success, state?.id]);
  return <form action={action} className="staff-editor-sections">
    {facility?.id ? <input name="id" type="hidden" value={facility.id} /> : null}
    <section className="staff-editor-section"><p className="eyebrow">Facility</p><h2>Identity</h2><div className="staff-form-grid">
      <label>Name<input defaultValue={facility?.name} name="name" required /></label>
      <label>Code<input defaultValue={facility?.code} name="code" required placeholder="e.g. MAIN" /></label>
      <label>Facility type<input defaultValue={facility?.facility_type ?? "clinic"} name="facility_type" required placeholder="clinic, hospital, pharmacy…" /></label>
      <label>Timezone<input defaultValue={facility?.timezone ?? "Africa/Kampala"} name="timezone" required placeholder="Africa/Kampala" /></label>
    </div></section>
    <section className="staff-editor-section"><p className="eyebrow">Location</p><h2>Address</h2><div className="staff-form-grid">
      <label className="staff-form-grid__wide">Address line<input defaultValue={facility?.address_line ?? ""} name="address_line" /></label>
      <label>City<input defaultValue={facility?.city ?? ""} name="city" /></label>
      <label>District<input defaultValue={facility?.district ?? ""} name="district" /></label>
      <label>Country code<input defaultValue={facility?.country_code ?? "UG"} maxLength={2} name="country_code" /></label>
    </div></section>
    <section className="staff-editor-section"><p className="eyebrow">Contact</p><h2>Contact details</h2><div className="staff-form-grid">
      <label>Phone<input defaultValue={facility?.phone ?? ""} name="phone" /></label>
      <label>Email<input defaultValue={facility?.email ?? ""} name="email" type="email" /></label>
    </div></section>
    <section className="staff-editor-section"><p className="eyebrow">Visibility</p><h2>Publication</h2>
      <BoolField defaultChecked={facility?.is_public ?? true} hint="Show this facility on the public website." label="Public visibility" name="is_public" />
      <BoolField defaultChecked={facility?.is_active ?? true} hint="Inactive facilities cannot be assigned to new departments." label="Active" name="is_active" />
    </section>
    <FormMessage state={state} />
    <div className="staff-form-actions">
      <Link className="btn btn-secondary" href={facility?.id ? `/staff/facilities/${facility.id}` : "/staff/facilities"}>Cancel</Link>
      <button className="btn" disabled={pending} type="submit">{pending ? "Saving…" : facility?.id ? "Save changes" : "Create facility"}</button>
    </div>
  </form>;
}

/* --------------------------------- departments -------------------------------- */

export type DepartmentFormValues = {
  id?: string; name: string; code: string; description: string | null;
  facility_id: string; phone: string | null; email: string | null;
  opening_hours: Record<string, unknown> | null; is_public: boolean; is_active: boolean; sort_order: number;
};

export function DepartmentForm({department, facilities}: {department?: DepartmentFormValues; facilities: Array<{id: string; name: string}>}) {
  const [state, action, pending] = useActionState(saveDepartmentAction, null);
  const router = useRouter();
  useEffect(() => {
    if (state?.success && state.id && !department?.id) router.push(`/staff/departments/${state.id}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.success, state?.id]);
  const [hoursText, setHoursText] = useState(department ? openingHoursToText(department.opening_hours) : "");
  return <form action={action} className="staff-editor-sections">
    {department?.id ? <input name="id" type="hidden" value={department.id} /> : null}
    <section className="staff-editor-section"><p className="eyebrow">Department</p><h2>Identity</h2><div className="staff-form-grid">
      <label>Name<input defaultValue={department?.name} name="name" required /></label>
      <label>Code<input defaultValue={department?.code} name="code" required placeholder="e.g. CARDIO" /></label>
      <label>Facility<select defaultValue={department?.facility_id ?? ""} name="facility_id" required><option value="">Choose a facility</option>{facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}</select></label>
      <label>Sort order<input defaultValue={department?.sort_order ?? 0} min={0} name="sort_order" type="number" /></label>
      <label className="staff-form-grid__wide">Description<textarea defaultValue={department?.description ?? ""} name="description" rows={3} /></label>
    </div></section>
    <section className="staff-editor-section"><p className="eyebrow">Contact &amp; hours</p><h2>Details</h2><div className="staff-form-grid">
      <label>Phone<input defaultValue={department?.phone ?? ""} name="phone" /></label>
      <label>Email<input defaultValue={department?.email ?? ""} name="email" type="email" /></label>
      <label className="staff-form-grid__wide">Opening hours <span className="staff-label-optional">JSON, e.g. {"{\"mon\":\"08:00-17:00\",\"sat\":\"09:00-13:00\"}"}</span><textarea name="opening_hours" onChange={(event) => setHoursText(event.target.value)} placeholder='{"mon":"08:00-17:00","tue":"08:00-17:00"}' rows={3} value={hoursText} /></label>
    </div></section>
    <section className="staff-editor-section"><p className="eyebrow">Visibility</p><h2>Publication</h2>
      <BoolField defaultChecked={department?.is_public ?? true} hint="Show this department on the public website." label="Public visibility" name="is_public" />
      <BoolField defaultChecked={department?.is_active ?? true} hint="Inactive departments cannot be booked or shown publicly." label="Active" name="is_active" />
    </section>
    <FormMessage state={state} />
    <div className="staff-form-actions">
      <Link className="btn btn-secondary" href={department?.id ? `/staff/departments/${department.id}` : "/staff/departments"}>Cancel</Link>
      <button className="btn" disabled={pending} type="submit">{pending ? "Saving…" : department?.id ? "Save changes" : "Create department"}</button>
    </div>
  </form>;
}

/* ----------------------------------- services --------------------------------- */

export type ServiceFormValues = {
  id?: string; name: string; code: string; description: string | null; service_type: string;
  department_id: string | null; facility_id: string | null;
  base_price: number | null; currency_code: string; duration_minutes: number | null;
  is_public: boolean; is_active: boolean;
};

export function ServiceForm({service, departments, facilities, defaultDepartmentId}: {service?: ServiceFormValues; departments: Array<{id: string; name: string}>; facilities: Array<{id: string; name: string}>; defaultDepartmentId?: string}) {
  const [state, action, pending] = useActionState(saveServiceAction, null);
  const router = useRouter();
  useEffect(() => {
    if (state?.success && state.id && !service?.id) router.push(`/staff/services/${state.id}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.success, state?.id]);
  return <form action={action} className="staff-editor-sections">
    {service?.id ? <input name="id" type="hidden" value={service.id} /> : null}
    <section className="staff-editor-section"><p className="eyebrow">Service</p><h2>Identity</h2><div className="staff-form-grid">
      <label>Name<input defaultValue={service?.name} name="name" required /></label>
      <label>Code<input defaultValue={service?.code} name="code" required placeholder="e.g. CONSULT" /></label>
      <label>Service type<select defaultValue={service?.service_type ?? "clinical"} name="service_type"><option value="clinical">Clinical</option><option value="diagnostic">Diagnostic</option><option value="therapy">Therapy</option><option value="procedure">Procedure</option><option value="wellness">Wellness</option><option value="administrative">Administrative</option></select></label>
      <label className="staff-form-grid__wide">Description<textarea defaultValue={service?.description ?? ""} name="description" rows={3} /></label>
    </div></section>
    <section className="staff-editor-section"><p className="eyebrow">Catalogue placement</p><h2>Organization</h2><div className="staff-form-grid">
      <label>Department<select defaultValue={service?.department_id ?? defaultDepartmentId ?? ""} name="department_id"><option value="">Organization-wide (no department)</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
      <label>Facility <span className="staff-label-optional">optional</span><select defaultValue={service?.facility_id ?? ""} name="facility_id"><option value="">All facilities</option>{facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}</select></label>
    </div></section>
    <section className="staff-editor-section"><p className="eyebrow">Booking &amp; pricing</p><h2>Availability</h2><div className="staff-form-grid">
      <label>Base price<input defaultValue={service?.base_price ?? ""} min={0} name="base_price" step="0.01" type="number" /></label>
      <label>Currency<input defaultValue={service?.currency_code ?? "UGX"} maxLength={3} name="currency_code" /></label>
      <label>Duration (minutes) <span className="staff-label-optional">required for online booking</span><input defaultValue={service?.duration_minutes ?? ""} min={1} name="duration_minutes" type="number" /></label>
    </div></section>
    <section className="staff-editor-section"><p className="eyebrow">Visibility</p><h2>Publication</h2>
      <BoolField defaultChecked={service?.is_public ?? true} hint="Show on the public services directory. Online booking also needs a duration." label="Public visibility" name="is_public" />
      <BoolField defaultChecked={service?.is_active ?? true} hint="Inactive services cannot be booked or shown." label="Active" name="is_active" />
    </section>
    <FormMessage state={state} />
    <div className="staff-form-actions">
      <Link className="btn btn-secondary" href={service?.id ? `/staff/services/${service.id}` : "/staff/services"}>Cancel</Link>
      <button className="btn" disabled={pending} type="submit">{pending ? "Saving…" : service?.id ? "Save changes" : "Create service"}</button>
    </div>
  </form>;
}

/* ------------------------------ activation toggles ----------------------------- */

export function ActiveToggle({id, isActive, kind, redirectTo}: {id: string; isActive: boolean; kind: "facility" | "department" | "service"; redirectTo?: string}) {
  const [state, setState] = useState<ActionResult>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const action = kind === "facility" ? setFacilityActiveAction : kind === "department" ? setDepartmentActiveAction : setServiceActiveAction;
  return <span className="staff-catalog-toggle">
    <FormMessage state={state} />
    <button
      className="btn btn-secondary"
      disabled={pending}
      onClick={async () => {
        const label = kind === "facility" ? "facility" : kind === "department" ? "department" : "service";
        if (isActive && !window.confirm(`Deactivate this ${label}? It will be hidden from the public site and cannot be booked.`)) return;
        setPending(true);
        const result = await action(id, !isActive);
        setPending(false);
        setState(result);
        if (result?.success) router.refresh();
      }}
      type="button"
    >{pending ? "Updating…" : isActive ? "Deactivate" : "Activate"}</button>
    {redirectTo ? null : null}
  </span>;
}

/* --------------------------- department staff manager --------------------------- */

export type AssignableMember = {id: string; full_name: string; role_name: string};
export type AssignedMember = {membership_id: string; department_id: string; is_primary: boolean; full_name: string; job_title: string | null; role_name: string; is_active: boolean};

export function DepartmentStaffManager({departmentId, members, assignable}: {departmentId: string; members: AssignedMember[]; assignable: AssignableMember[]}) {
  const [state, setState] = useState<ActionResult>(null);
  const [pending, setPending] = useState<string | null>(null);
  const router = useRouter();
  const assignedIds = new Set(members.map((member) => member.membership_id));
  const available = assignable.filter((member) => !assignedIds.has(member.id));

  async function run(key: string, fn: () => Promise<ActionResult>) {
    setPending(key);
    const result = await fn();
    setPending(null);
    setState(result);
    if (result?.success) router.refresh();
  }

  return <div>
    <FormMessage state={state} />
    {members.length ? <ul className="staff-catalog-staff-list">
      {members.map((member) => <li key={member.membership_id}>
        <div><strong>{member.full_name}</strong><small>{member.role_name}{member.job_title ? ` · ${member.job_title}` : ""}{member.is_primary ? " · Department head" : ""}{!member.is_active ? " · inactive" : ""}</small></div>
        <div className="staff-catalog-staff-actions">
          {!member.is_primary ? <button className="btn btn-secondary" disabled={pending !== null} onClick={() => void run(`head-${member.membership_id}`, () => setDepartmentHeadAction(departmentId, member.membership_id))} type="button">{pending === `head-${member.membership_id}` ? "Setting…" : "Set as head"}</button> : <span className="staff-catalog-head-badge">Head</span>}
          <button className="btn btn-secondary" disabled={pending !== null} onClick={() => { if (window.confirm(`Remove ${member.full_name} from this department?`)) void run(`rm-${member.membership_id}`, () => removeDepartmentStaffAction(departmentId, member.membership_id)); }} type="button">{pending === `rm-${member.membership_id}` ? "Removing…" : "Remove"}</button>
        </div>
      </li>)}
    </ul> : <p className="staff-section-description">No staff assigned to this department yet.</p>}
    {available.length ? <form className="staff-catalog-assign" onSubmit={(event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const membershipId = String(new FormData(form).get("membership_id") ?? "");
      if (!membershipId) return;
      void run("assign", async () => { const result = await assignDepartmentStaffAction(departmentId, membershipId); if (result?.success) form.reset(); return result; });
    }}>
      <label className="sr-only" htmlFor={`assign-${departmentId}`}>Assign staff member</label>
      <select id={`assign-${departmentId}`} name="membership_id" required><option value="">Assign a staff member…</option>{available.map((member) => <option key={member.id} value={member.id}>{member.full_name} — {member.role_name}</option>)}</select>
      <button className="btn" disabled={pending === "assign"} type="submit">{pending === "assign" ? "Assigning…" : "Assign"}</button>
    </form> : null}
  </div>;
}
