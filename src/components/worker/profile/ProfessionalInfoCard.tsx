import { Card } from "../../ui/Card";
import { useLanguage } from "../../../context/LanguageContext";
import type { Employee } from "../../../types";

interface ProfessionalInfoCardProps {
  employee: Employee;
  objectName: string | null;
  brigadeName: string | null;
  prorabName: string | null;
  experienceYears: number;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2.5 text-sm last:border-0">
      <span className="text-ink-secondary">{label}</span>
      <span className="text-right font-semibold text-ink">{value}</span>
    </div>
  );
}

export function ProfessionalInfoCard({ employee, objectName, brigadeName, prorabName, experienceYears }: ProfessionalInfoCardProps) {
  const { strings } = useLanguage();
  const s = strings.worker;

  return (
    <Card className="p-4">
      <h2 className="text-sm font-bold text-ink">{s.profileProfessionalInfoTitle}</h2>
      <div className="mt-1">
        <InfoRow label={s.profileSpecialty} value={employee.specialty} />
        <InfoRow label={s.profileGrade} value={s.profileGradeValue(employee.qualificationGrade)} />
        <InfoRow label={s.profileFieldExperience} value={s.profileYearsValue(experienceYears)} />
        <InfoRow label={s.profileObject} value={objectName ?? "—"} />
        <InfoRow label={s.profileBrigade} value={brigadeName ?? "—"} />
        <InfoRow label={s.profileFieldForeman} value={prorabName ?? "—"} />
      </div>
    </Card>
  );
}
