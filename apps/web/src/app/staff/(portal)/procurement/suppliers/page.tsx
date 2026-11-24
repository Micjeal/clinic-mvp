import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { listSuppliersOnly } from "@/server/services/procurement.service";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { AuthorizationError } from "@/server/errors";
import { SupplierForm } from "@/features/procurement/components/procurement-workspace";
import Link from "next/link";

export const metadata = { title: "Suppliers" };

export default async function SuppliersPage() {
  let suppliers;
  try {
    suppliers = await listSuppliersOnly();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  const canManage = await requirePermission(Permissions.PROCUREMENT_MANAGE).then(() => true).catch(() => false);
  return (
    <div className="staff-page">
      <StaffPageHeader eyebrow="Operations" title="Suppliers" description="Vendors the facility buys stock from." actions={<Link className="btn btn--secondary" href="/staff/procurement">← Back to procurement</Link>} />
      {canManage ? <section className="staff-panel"><div className="staff-panel__header"><h2>Add a supplier</h2></div><SupplierForm /></section> : null}
      <section className="staff-panel">
        <div className="staff-table-wrap"><table className="staff-table">
          <thead><tr><th>Name</th><th>Contact</th><th>Phone</th><th>Email</th><th>Terms</th></tr></thead>
          <tbody>
            {suppliers.length === 0 ? <tr><td colSpan={5} className="staff-table-empty">No suppliers yet.</td></tr> :
              suppliers.map((supplier) => <tr key={supplier.id}><td>{supplier.name}</td><td>{supplier.contact_person ?? "—"}</td><td>{supplier.phone ?? "—"}</td><td>{supplier.email ?? "—"}</td><td>{supplier.payment_terms_days} days</td></tr>)}
          </tbody>
        </table></div>
      </section>
    </div>
  );
}
