import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { listImagingTests } from "@/server/services/radiology.service";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { AuthorizationError } from "@/server/errors";
import { ImagingTestForm } from "@/features/radiology/components/radiology-workspace";
import Link from "next/link";
import { ScanLine } from "lucide-react";

export const metadata = { title: "Imaging exam catalog" };

const MODALITY_LABELS: Record<string, string> = { xray: "X-ray", ultrasound: "Ultrasound", ct: "CT", mri: "MRI", mammography: "Mammography", fluoroscopy: "Fluoroscopy", other: "Other" };

export default async function ImagingTestsPage() {
  let tests;
  try {
    tests = await listImagingTests();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  const canManage = await requirePermission(Permissions.DEPARTMENT_MANAGE).then(() => true).catch(() => false);
  return (
    <div className="staff-page">
      <div className="staff-page-heading staff-page-heading--doctor lab-order-heading">
        <div className="staff-doctor-avatar lab-order-heading__icon" aria-hidden="true"><ScanLine size={26} /></div>
        <div className="doctor-identity-copy">
          <p className="eyebrow">Clinical · Radiology</p>
          <h1>Exam catalog</h1>
          <p>Radiology exams available for ordering.</p>
        </div>
        <div className="staff-page-heading__actions"><Link className="btn btn--secondary" href="/staff/radiology">← Back to radiology</Link></div>
      </div>
      {canManage ? <section className="staff-panel lab-list-panel"><div className="staff-panel__header"><h2>Add an exam</h2></div><ImagingTestForm canManage={canManage} /></section> : null}
      <section className="staff-panel lab-list-panel">
        <div className="staff-panel__header"><h2>Exams</h2><span className="staff-table-sub">{tests.length} configured</span></div>
        <div className="staff-table-wrap"><table className="staff-table">
          <thead><tr><th>Code</th><th>Exam</th><th>Modality</th><th>Body part</th></tr></thead>
          <tbody>
            {tests.length === 0 ? <tr><td colSpan={4} className="staff-table-empty">No exams configured yet.</td></tr> :
              tests.map((test) => (
                <tr key={test.id}><td>{test.code}</td><td>{test.name}</td><td><span className="exam-picker__modality">{(MODALITY_LABELS[test.modality] ?? test.modality).toUpperCase()}</span></td><td>{test.body_part ?? "—"}</td></tr>
              ))}
          </tbody>
        </table></div>
      </section>
    </div>
  );
}
