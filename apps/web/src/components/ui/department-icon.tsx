import { Activity, Baby, Bone, HeartPulse, Smile, Stethoscope, Venus } from "lucide-react";

export function DepartmentIcon({ name }: { name: string }) {
  const normalizedName = name.toLowerCase();
  if (normalizedName.includes("pediatric")) return <Baby aria-hidden="true" />;
  if (normalizedName.includes("women")) return <Venus aria-hidden="true" />;
  if (normalizedName.includes("dental")) return <Smile aria-hidden="true" />;
  if (normalizedName.includes("physio")) return <Activity aria-hidden="true" />;
  if (normalizedName.includes("ortho")) return <Bone aria-hidden="true" />;
  if (normalizedName.includes("card")) return <HeartPulse aria-hidden="true" />;
  return <Stethoscope aria-hidden="true" />;
}
