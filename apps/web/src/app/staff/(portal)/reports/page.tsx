import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getOperationalReports } from "@/server/services/reports.service";
import { AuthorizationError } from "@/server/errors";
import Link from "next/link";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  let report;
  try {
    report = await getOperationalReports();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  const cards = [
    { label: "Appointments today", value: report.appointmentsToday, href: "/staff/appointments" },
    { label: "Appointments (7d)", value: report.appointmentsWeek, href: "/staff/appointments" },
    { label: "Encounters today", value: report.encountersToday, href: "/staff/triage" },
    { label: "Encounters total", value: report.encountersTotal, href: "/staff/triage" },
    { label: "Revenue collected", value: `${report.revenueCollected.toLocaleString()} UGX`, href: "/staff/billing" },
    { label: "Outstanding balances", value: `${report.revenueOutstanding.toLocaleString()} UGX`, href: "/staff/billing" },
    { label: "Open insurance claims", value: report.openClaims, href: "/staff/insurance" },
    { label: "Lab orders pending", value: report.labPending, href: "/staff/lab" },
    { label: "Imaging pending", value: report.imagingPending, href: "/staff/radiology" },
    { label: "Active admissions", value: report.admissionsActive, href: "/staff/wards" },
    { label: "Patients", value: report.patientsTotal, href: "/staff/patients" },
    { label: "In queue now", value: report.queueActive, href: "/staff/queue" },
  ];
  return (
    <div className="staff-page">
      <StaffPageHeader eyebrow="Management" title="Operational reports" description="Live snapshot across clinical, finance and inpatient activity." />
      <div className="staff-kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        {cards.map((card) => (
          <Link className="staff-kpi staff-kpi--link" href={card.href} key={card.label} title={`Open ${card.label}`}>
            <span>{card.label}</span><strong>{card.value}</strong>
          </Link>
        ))}
      </div>
    </div>
  );
}
