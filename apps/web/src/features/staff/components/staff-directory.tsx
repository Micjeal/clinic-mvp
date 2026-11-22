"use client";

import Link from "next/link";
import { Search, UserRound, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { staffMembershipPath } from "@/features/staff/utils/staff-route";

type DirectoryMember = {
  id: string;
  full_name: string;
  job_title: string | null;
  employee_number: string | null;
  role_key: string;
  role_name: string;
  facility_name: string | null;
  department_names: string[];
  is_active: boolean;
  must_change_password: boolean;
};

type DoctorProfile = { is_public: boolean; accepting_appointments: boolean } | null | undefined;

export function StaffDirectory({ members, doctorById }: { members: DirectoryMember[]; doctorById: Record<string, DoctorProfile> }) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [facility, setFacility] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const roles = useMemo(() => [...new Set(members.map((member) => member.role_name))].sort(), [members]);
  const facilities = useMemo(() => [...new Set(members.map((member) => member.facility_name).filter(Boolean) as string[])].sort(), [members]);
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return members.filter((member) => {
      const haystack = [member.full_name, member.job_title, member.employee_number, member.role_name, ...member.department_names].filter(Boolean).join(" ").toLocaleLowerCase();
      return (!query || haystack.includes(query)) && (role === "all" || member.role_name === role) && (status === "all" || (status === "active" ? member.is_active : !member.is_active)) && (facility === "all" || member.facility_name === facility);
    });
  }, [facility, members, role, search, status]);

  const clearFilters = () => { setSearch(""); setRole("all"); setStatus("all"); setFacility("all"); };
  const initials = (name: string) => name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return <div className="staff-directory">
    <header className="staff-page-heading staff-page-heading--directory">
      <div><p className="eyebrow">Staff</p><h1>Staff</h1><p>Manage clinic staff, access and clinician configuration.</p></div>
      <Link className="btn" href="/staff/users/new"><UserPlus aria-hidden="true" />Add staff</Link>
    </header>
    <section className="staff-directory-filters" aria-label="Staff filters">
      <label className="staff-directory-search"><span className="sr-only">Search staff</span><Search aria-hidden="true" /><input onChange={(event) => setSearch(event.target.value)} placeholder="Search name, role or employee number" type="search" value={search} /></label>
      <label className={showFilters ? "is-open" : ""}><span className="sr-only">Role</span><select aria-label="Role" onChange={(event) => setRole(event.target.value)} value={role}><option value="all">All roles</option>{roles.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className={showFilters ? "is-open" : ""}><span className="sr-only">Status</span><select aria-label="Status" onChange={(event) => setStatus(event.target.value)} value={status}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
      <label className={showFilters ? "is-open" : ""}><span className="sr-only">Facility</span><select aria-label="Facility" onChange={(event) => setFacility(event.target.value)} value={facility}><option value="all">All facilities</option>{facilities.map((item) => <option key={item}>{item}</option>)}</select></label>
      <button aria-expanded={showFilters} className="staff-directory-filter-toggle" onClick={() => setShowFilters((value) => !value)} type="button">{showFilters ? "Hide filters" : "Filters"}</button>
      {(search || role !== "all" || status !== "all" || facility !== "all") ? <button className="staff-directory-clear" onClick={clearFilters} type="button">Clear</button> : null}
    </section>
    {filtered.length ? <>
      <div className="staff-directory-table-wrap"><table className="staff-table staff-directory-table"><caption className="sr-only">Staff directory</caption><thead><tr><th>Staff member</th><th>Role</th><th>Assignment</th><th>Status</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{filtered.map((member) => <StaffRow key={member.id} doctorProfile={doctorById[member.id]} initials={initials(member.full_name)} member={member} />)}</tbody></table></div>
      <div className="staff-directory-mobile" aria-label="Staff directory cards">{filtered.map((member) => <StaffMobileCard key={member.id} doctorProfile={doctorById[member.id]} initials={initials(member.full_name)} member={member} />)}</div>
    </> : <div className="staff-empty staff-directory-empty"><UserRound aria-hidden="true" /><h2>{members.length ? "No staff members found" : "No staff members yet"}</h2><p>{members.length ? "Try changing the search or filters." : "Add the first staff member to begin configuring clinic access."}</p>{!members.length ? <Link className="btn" href="/staff/users/new">Add staff</Link> : null}</div>}
  </div>;
}

function StaffRow({ member, doctorProfile, initials }: { member: DirectoryMember; doctorProfile: DoctorProfile; initials: string }) {
  const doctor = member.role_key === "doctor";
  return <tr><td><div className="staff-directory-identity"><span className="staff-directory-avatar" aria-hidden="true">{initials}</span><span><strong>{member.full_name}</strong><small>{member.job_title || member.employee_number || "Staff member"}</small></span></div></td><td><span className="staff-directory-role">{member.role_name}</span></td><td><span>{member.department_names.join(", ") || (member.facility_name || "Not assigned")}</span>{member.department_names.length && member.facility_name ? <small>{member.facility_name}</small> : null}</td><td><span className={`staff-member-status ${member.is_active ? "is-active" : "is-inactive"}`}>{member.is_active ? (member.must_change_password ? "Password setup required" : "Active") : "Inactive"}</span>{doctor ? <small className="staff-row-substatus">{doctorProfile?.is_public ? "Published" : "Website hidden"} · {doctorProfile?.accepting_appointments ? "Online booking open" : "Booking paused"}</small> : null}</td><td><Link className="staff-table-action" href={staffMembershipPath(member.id)}>{doctor ? "Manage doctor" : "Manage"}</Link></td></tr>;
}

function StaffMobileCard({ member, doctorProfile, initials }: { member: DirectoryMember; doctorProfile: DoctorProfile; initials: string }) {
  const doctor = member.role_key === "doctor";
  return <article className="staff-directory-mobile-card"><div className="staff-directory-mobile-card__top"><div className="staff-directory-identity"><span className="staff-directory-avatar" aria-hidden="true">{initials}</span><span><strong>{member.full_name}</strong><small>{member.job_title || member.role_name}</small></span></div><span className={`staff-member-status ${member.is_active ? "is-active" : "is-inactive"}`}>{member.is_active ? "Active" : "Inactive"}</span></div><p>{member.role_name}{member.department_names.length ? ` · ${member.department_names.join(", ")}` : member.facility_name ? ` · ${member.facility_name}` : ""}</p>{member.department_names.length && member.facility_name ? <small>{member.facility_name}</small> : null}{doctor ? <p className="staff-row-substatus">{doctorProfile?.is_public ? "Published" : "Website hidden"} · {doctorProfile?.accepting_appointments ? "Online booking open" : "Booking paused"}</p> : null}<Link className="btn btn--secondary" href={staffMembershipPath(member.id)}>{doctor ? "Manage doctor" : "Manage"}</Link></article>;
}
