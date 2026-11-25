import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getLabTests, getLabOrderForm } from "@/server/services/lab.service";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { AuthorizationError } from "@/server/errors";
import { LabTestForm } from "@/features/lab/components/lab-test-form";
import { LabTestRow } from "@/features/lab/components/lab-test-row";
import Link from "next/link";
import { FlaskConical } from "lucide-react";

export const metadata = { title: "Lab test catalog" };

export default async function LabTestsPage() {
  let tests;
  try {
    tests = await getLabTests();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  const canManage = await requirePermission(Permissions.DEPARTMENT_MANAGE).then(() => true).catch(() => false);
  const departments = canManage ? (await getLabOrderForm().catch(() => ({ departments: [] }))).departments : [];
  return (
    <div className="staff-page">
      <div className="staff-page-heading staff-page-heading--doctor lab-order-heading">
        <div className="staff-doctor-avatar lab-order-heading__icon" aria-hidden="true"><FlaskConical size={26} /></div>
        <div className="doctor-identity-copy">
          <p className="eyebrow">Clinical · Laboratory</p>
          <h1>Test catalog</h1>
          <p>Tests available for ordering — edit details and prices here.</p>
        </div>
        <div className="staff-page-heading__actions"><Link className="btn btn--secondary" href="/staff/lab">← Back to laboratory</Link></div>
      </div>
      {canManage ? <section className="staff-panel"><div className="staff-panel__header"><h2>Add a test</h2></div><LabTestForm canManage={canManage} departments={departments as never} /></section> : null}
      <section className="staff-panel lab-list-panel">
        <div className="staff-panel__header"><h2>Tests</h2><span className="staff-table-sub">{tests.length} configured</span></div>
        <div className="staff-table-wrap"><table className="staff-table">
          <thead><tr><th>Code</th><th>Test</th><th>Specimen</th><th>Unit</th><th>Reference</th><th className="staff-col-amount">Price</th>{canManage ? <th /> : null}</tr></thead>
          <tbody>
            {tests.length === 0 ? <tr><td colSpan={canManage ? 7 : 6} className="staff-table-empty">No tests configured yet.</td></tr> :
              tests.map((test) => (
                <LabTestRow canManage={canManage} departments={departments as never} key={test.id} test={test as never} />
              ))}
          </tbody>
        </table></div>
      </section>
    </div>
  );
}
