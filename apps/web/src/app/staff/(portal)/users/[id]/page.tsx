import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StaffDetailManager } from "@/features/staff/components/staff-detail-manager";
import { assertStaffManageAccess } from "@/server/actions/staff-management.actions";
import {
  findStaffDirectoryMember,
  getClinicianManagementData,
  listStaffRoles,
} from "@/server/repositories/staff-management.repository";
import { getPublicDepartments } from "@/server/services/department.service";
import { getPublicFacilities } from "@/server/services/facility.service";
import { findPublicClinicianProfile } from "@/server/services/public-clinician.service";
import { getPublicServices } from "@/server/services/service.service";
import { ResetStaffPassword } from "@/features/staff/components/reset-staff-password";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Staff member" };

type DoctorSection = "summary" | "clinical" | "profile" | "availability" | "timeoff";

const doctorSections = new Set<DoctorSection>([
  "summary",
  "clinical",
  "profile",
  "availability",
  "timeoff",
]);

function doctorInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default async function StaffMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ setup?: string; section?: string }>;
}) {
  const staff = await assertStaffManageAccess();
  const member = await findStaffDirectoryMember(
    (await params).id,
    staff.membership.organization_id,
  );
  if (!member) notFound();

  const [roles, configuration, departments, services, facilities] = await Promise.all([
    listStaffRoles(staff.membership.organization_id),
    getClinicianManagementData(member.id, staff.membership.organization_id),
    getPublicDepartments(),
    getPublicServices(),
    getPublicFacilities(),
  ]);
  const departmentIds = [...configuration.departments]
    .sort((left, right) => Number(right.is_primary) - Number(left.is_primary))
    .map((item) => item.department_id);
  const serviceIds = configuration.services.map((item) => item.service_id);
  const query = await searchParams;
  const setup = query?.setup === "doctor";
  const requestedSection = query?.section as DoctorSection | undefined;
  const initialSection =
    requestedSection && doctorSections.has(requestedSection) ? requestedSection : undefined;
  const publicProfile =
    member.role_key === "doctor" && configuration.profile?.slug
      ? await findPublicClinicianProfile(configuration.profile.slug)
      : null;
  const nextAvailability = publicProfile?.nextSlot
    ? new Intl.DateTimeFormat("en-UG", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: publicProfile.nextSlot.timeZone,
      }).format(new Date(publicProfile.nextSlot.startsAt))
    : null;
  const admin = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
  const { data: authUser } = await admin.auth.admin.getUserById(member.user_id);
  const memberEmail = authUser?.user?.email ?? null;
  const facilityName =
    facilities.find((item) => item.id === member.primary_facility_id)?.name ?? null;
  const primaryDepartmentName = departmentIds.length
    ? departments.find((item) => item.id === departmentIds[0])?.name ?? null
    : null;
  const doctorName = configuration.profile?.display_name || member.full_name;
  const doctorTitle = configuration.profile?.professional_title || member.job_title;

  return (
    <div className="staff-page staff-doctor-page">
      <Link className="staff-breadcrumb" href="/staff/users">
        &larr; Staff
      </Link>

      <header
        className={`staff-page-heading ${member.role_key === "doctor" ? "staff-page-heading--doctor doctor-identity-header" : "staff-page-heading--staff-member"}`}
      >
        <div className="staff-page-heading__identity">
          <span aria-hidden="true" className="staff-doctor-avatar">
            {doctorInitials(member.role_key === "doctor" ? doctorName : member.full_name)}
          </span>
          <div className="doctor-identity-copy">
            <p className="eyebrow">{member.role_key === "doctor" ? "Doctor" : "Staff member"}</p>
            <h1>{member.role_key === "doctor" ? doctorName : member.full_name}</h1>
            {doctorTitle ? <p className="doctor-professional-title">{doctorTitle}</p> : null}
            {memberEmail ? <p className="doctor-identity-email">{memberEmail}</p> : null}
            {member.role_key === "doctor" && (primaryDepartmentName || facilityName) ? (
              <p className="doctor-identity-meta">
                {[primaryDepartmentName, facilityName].filter(Boolean).join(" • ")}
              </p>
            ) : member.role_key !== "doctor" ? (
              <><p>{member.role_name}</p>{facilityName ? <p className="doctor-identity-meta">{facilityName}</p> : null}</>
            ) : null}
            {member.role_key === "doctor" ? (
              <div aria-label="Doctor status" className="doctor-identity-statuses">
                <span className={member.is_active ? "is-active" : "is-inactive"}>
                  {member.is_active ? "Active" : "Inactive"}
                </span>
                <span className={configuration.profile?.is_public ? "is-active" : "is-inactive"}>
                  {configuration.profile?.is_public ? "Published" : "Website hidden"}
                </span>
                <span className={configuration.profile?.accepting_appointments ? "is-active" : "is-paused"}>
                  {configuration.profile?.accepting_appointments ? "Online booking enabled" : "Online booking paused"}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="staff-page-heading__actions">
          <ResetStaffPassword memberName={member.full_name} membershipId={member.id} />
          {member.role_key === "doctor" && configuration.profile?.slug ? (
            <Link
              className="btn btn--secondary btn--compact"
              href={`/doctors/${configuration.profile.slug}`}
              target="_blank"
            >
              Preview public profile
            </Link>
          ) : null}
          {member.role_key === "doctor" ? (
            <details className="doctor-more-menu">
              <summary className="btn btn--secondary btn--compact">
                <MoreHorizontal aria-hidden="true" />
                More
              </summary>
              <div className="doctor-more-menu__panel">
                <Link href="#doctor-setup-top">View setup progress</Link>
                <Link href="#profile">Manage public profile</Link>
                <Link href="#publishing">Manage publishing</Link>
                <Link href="/staff/users">Back to staff directory</Link>
              </div>
            </details>
          ) : (
            <span className={`staff-member-status ${member.is_active ? "is-active" : "is-inactive"}`}>
              {member.is_active
                ? member.must_change_password
                  ? "Password setup required"
                  : "Active"
                : "Inactive"}
            </span>
          )}
        </div>
      </header>

      {setup && member.role_key === "doctor" ? (
        <div className="staff-setup-banner" role="status">
          <strong>Doctor account created</strong>
          <span>Complete the clinical and scheduling setup before publishing this doctor online.</span>
        </div>
      ) : null}

      <StaffDetailManager
        achievements={configuration.achievements}
        departmentIds={departmentIds}
        departments={departments.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
        }))}
        exceptions={configuration.exceptions}
        facilities={facilities.map((item) => ({ id: item.id, name: item.name, timezone: item.timezone }))}
        facilityId={member.primary_facility_id}
        facilityName={facilityName}
        initialSection={initialSection}
        member={member}
        nextAvailability={nextAvailability}
        profile={configuration.profile}
        qualifications={configuration.qualifications}
        roles={roles}
        rules={configuration.rules}
        serviceIds={serviceIds}
        services={services.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          department_id: item.department_id,
          duration_minutes: item.duration_minutes,
        }))}
        specializations={configuration.specializations}
      />
    </div>
  );
}
