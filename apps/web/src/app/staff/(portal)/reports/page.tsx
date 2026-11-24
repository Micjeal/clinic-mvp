import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getOperationalReports } from "@/server/services/reports.service";
import { AuthorizationError } from "@/server/errors";

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
    { label: "Appointments today", value: report.appointmentsToday },
    { label: "Appointments (7d)", value: report.appointmentsWeek },
    { label: "Encounters today", value: report.encountersToday },
    { label: "Encounters total", value: report.encountersTotal },
    { label: "Revenue collected", value: `${report.revenueCollected.toLocaleString()} UGX` },
    { label: "Outstanding balances", value: `${report.revenueOutstanding.toLocaleString()} UGX` },
    { label: "Open insurance claims", value: report.openClaims },
    { label: "Lab orders pending", value: report.labPending },
    { label: "Imaging pending", value: report.imagingPending },
    { label: "Active admissions", value: report.admissionsActive },
    { label: "Patients", value: report.patientsTotal },
    { label: "In queue now", value: report.queueActive },
  ];
  return (
    <div className="staff-page">
      <StaffPageHeader eyebrow="Management" title="Operational reports" description="Live snapshot across clinical, finance and inpatient activity." />
      <div className="staff-kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        {cards.map((card) => (
          <div className="staff-kpi" key={card.label}><span>{card.label}</span><strong>{card.value}</strong></div>
        ))}
      </div>
    </div>
  );
}
