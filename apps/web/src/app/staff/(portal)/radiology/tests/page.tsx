import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { listImagingTests } from "@/server/services/radiology.service";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { AuthorizationError } from "@/server/errors";
import { ImagingTestForm } from "@/features/radiology/components/radiology-workspace";
import Link from "next/link";

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
      <StaffPageHeader eyebrow="Clinical" title="Imaging exam catalog" description="Radiology exams available for ordering." actions={<Link className="btn btn--secondary" href="/staff/radiology">← Back to radiology</Link>} />
      {canManage ? <section className="staff-panel"><div className="staff-panel__header"><h2>Add an exam</h2></div><ImagingTestForm canManage={canManage} /></section> : null}
      <section className="staff-panel">
        <div className="staff-table-wrap"><table className="staff-table">
          <thead><tr><th>Code</th><th>Exam</th><th>Modality</th><th>Body part</th><th className="staff-col-amount">Price</th></tr></thead>
          <tbody>
            {tests.length === 0 ? <tr><td colSpan={5} className="staff-table-empty">No exams configured yet.</td></tr> :
              tests.map((test) => (
                <tr key={test.id}><td>{test.code}</td><td>{test.name}</td><td>{MODALITY_LABELS[test.modality] ?? test.modality}</td><td>{test.body_part ?? "—"}</td><td className="staff-col-amount">{Number(test.price).toLocaleString()} {test.currency_code}</td></tr>
              ))}
          </tbody>
        </table></div>
      </section>
    </div>
  );
}
