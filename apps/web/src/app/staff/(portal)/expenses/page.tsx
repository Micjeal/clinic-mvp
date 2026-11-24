import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getExpensesData } from "@/server/actions/expenses.actions";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { AuthorizationError } from "@/server/errors";
import { ExpensesWorkspace } from "@/features/expenses/components/expenses-workspace";
import { listOrgFacilities } from "@/server/repositories/billing.repository";

export const metadata = { title: "Expenses" };

export default async function ExpensesPage() {
  let data;
  try {
    data = await getExpensesData();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  const staff = await requirePermission(Permissions.EXPENSES_READ);
  const facilities = await listOrgFacilities(staff.membership.organization_id);
  return (
    <div className="staff-page">
      <StaffPageHeader eyebrow="Finance" title="Expenses" description="Facility spending — record, approve and track." />
      <ExpensesWorkspace items={data.items as never} facilities={facilities} canManage={data.canManage} />
    </div>
  );
}
