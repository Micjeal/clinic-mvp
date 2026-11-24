import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getWardFormData, listWardBoard } from "@/server/services/ward.service";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { AuthorizationError } from "@/server/errors";
import { BedForm, WardForm } from "@/features/ward/components/ward-workspace";
import Link from "next/link";

export const metadata = { title: "Wards & admissions" };

const BED_TONE: Record<string, string> = { available: "staff-status--paid", occupied: "staff-status--issued", reserved: "staff-status--issued", maintenance: "staff-status--void", closed: "staff-status--void" };

export default async function WardsPage() {
  let board;
  try {
    board = await listWardBoard();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  const canManageWards = await requirePermission(Permissions.WARD_MANAGE).then(() => true).catch(() => false);
  const canAdmit = await requirePermission(Permissions.ADMISSION_MANAGE).then(() => true).catch(() => false);
  const formData = canManageWards ? await getWardFormData().catch(() => ({ facilities: [] })) : { facilities: [] };
  const { wards, admissions } = board;
  const active = admissions.filter((a) => ["admitted", "on_leave"].includes(a.status));
  const occupancy = wards.reduce((sum, ward) => {
    const beds = (ward.beds ?? []) as { status: string }[];
    return sum + beds.filter((b) => b.status === "occupied").length;
  }, 0);
  const totalBeds = wards.reduce((sum, ward) => sum + ((ward.beds ?? []) as unknown[]).length, 0);

  return (
    <div className="staff-page">
      <StaffPageHeader eyebrow="Inpatient" title="Wards & admissions" description="Bed occupancy, admissions and discharges." actions={canAdmit ? <Link className="btn" href="/staff/wards/admissions/new">New admission</Link> : undefined} />
      <div className="staff-kpi-grid">
        <div className="staff-kpi"><span>Active admissions</span><strong>{active.length}</strong></div>
        <div className="staff-kpi"><span>Occupied beds</span><strong>{occupancy} / {totalBeds}</strong></div>
        <div className="staff-kpi"><span>Wards</span><strong>{wards.length}</strong></div>
      </div>
      {canManageWards ? <section className="staff-panel"><div className="staff-panel__header"><h2>Ward setup</h2></div><WardForm facilities={formData.facilities as never} /><BedForm wards={wards as never} /></section> : null}
      {wards.map((ward) => {
        const beds = (ward.beds ?? []) as { id: string; bed_number: string; status: string }[];
        const facility = ward.facilities as { name?: string } | null;
        return (
          <section className="staff-panel" key={ward.id}>
            <div className="staff-panel__header"><h2>{ward.name}</h2><span className="staff-table-sub">{ward.ward_type.replace("_", " ")} • {facility?.name}</span></div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
              {beds.length === 0 ? <p className="staff-table-empty">No beds configured.</p> : beds.map((bed) => <span className={`staff-status ${BED_TONE[bed.status] ?? ""}`} key={bed.id}>{bed.bed_number} — {bed.status}</span>)}
            </div>
            {canManageWards ? <div style={{ marginTop: ".9rem", maxWidth: "22rem" }}><BedForm wards={[{ id: ward.id, name: ward.name, ward_type: ward.ward_type, beds } as never]} /></div> : null}
          </section>
        );
      })}
      <section className="staff-panel">
        <div className="staff-panel__header"><h2>Recent admissions</h2></div>
        {admissions.length === 0 ? <p className="staff-table-empty">No admissions yet.</p> : (
          <ul className="staff-simple-list">{admissions.slice(0, 20).map((admission) => {
            const patient = admission.patients as { first_name?: string; last_name?: string; patient_number?: string } | null;
            const ward = admission.wards as { name?: string } | null;
            const bed = admission.beds as { bed_number?: string } | null;
            return <li key={admission.id}><span><Link className="staff-table-link" href={`/staff/wards/admissions/${admission.id}`}>{admission.admission_number}</Link> — {patient ? `${patient.first_name} ${patient.last_name}` : "Patient"} • {ward?.name}{bed?.bed_number ? ` bed ${bed.bed_number}` : ""}</span><span>{admission.status} • admitted {new Date(admission.admitted_at).toLocaleDateString()}</span></li>;
          })}</ul>
        )}
      </section>
    </div>
  );
}
