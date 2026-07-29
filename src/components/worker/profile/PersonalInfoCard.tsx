import { Card } from "../../ui/Card";
import { useLanguage } from "../../../context/LanguageContext";
import { formatDateShort } from "../../../utils/date";
import type { Employee } from "../../../types";

interface PersonalInfoCardProps {
  employee: Employee;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2.5 text-sm last:border-0">
      <span className="text-ink-secondary">{label}</span>
      <span className="text-right font-semibold text-ink">{value}</span>
    </div>
  );
}

export function PersonalInfoCard({ employee }: PersonalInfoCardProps) {
  const { strings } = useLanguage();
  const s = strings.worker;

  return (
    <Card className="p-4">
      <h2 className="text-sm font-bold text-ink">{s.profilePersonalInfoTitle}</h2>
      <div className="mt-1">
        <InfoRow label={s.profileFieldBirthDate} value={employee.birthDate ? formatDateShort(employee.birthDate) : "—"} />
        <InfoRow label={s.profileFieldAddress} value={employee.address ?? "—"} />
        <InfoRow label={s.profileFieldPassport} value={employee.passportNumber ?? "—"} />
        <InfoRow label={s.profileFieldHiredAt} value={employee.hiredAt ? formatDateShort(employee.hiredAt) : "—"} />
        <InfoRow label={s.profileFieldSection} value={employee.currentSection ?? "—"} />
        <InfoRow label={s.profileFieldEmergencyContact} value={employee.emergencyContact ?? "—"} />
      </div>
    </Card>
  );
}
