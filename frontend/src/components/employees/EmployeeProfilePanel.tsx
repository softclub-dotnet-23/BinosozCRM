import type { ComponentType } from "react";
import { Cake, Download, Mail, MapPin, Phone, User as UserIcon } from "lucide-react";
import type { StaffMember } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { StaffStatusBadge } from "./StaffStatusBadge";
import { formatDateShort } from "../../utils/date";
import { formatCurrency } from "../../utils/format";
import { calculateAge, formatTenure } from "../../utils/staffFormat";
import { useToast } from "../../hooks/useToast";

interface EmployeeProfilePanelProps {
  employee: StaffMember;
  onEdit: () => void;
  onTransfer: () => void;
}

export function EmployeeProfilePanel({ employee, onEdit, onTransfer }: EmployeeProfilePanelProps) {
  const { showToast } = useToast();
  const age = calculateAge(employee.birthDate);
  const unit = employee.brigadeName ?? employee.department ?? "—";

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col items-center text-center">
        <Avatar name={employee.fullName} className="h-20 w-20 text-2xl" />
        <h3 className="mt-3 text-base font-bold text-ink">{employee.fullName}</h3>
        <p className="text-sm text-ink-secondary">{employee.position}</p>
        <p className="mt-0.5 text-xs text-ink-muted">ID: {employee.id}</p>
        <div className="mt-2">
          <StaffStatusBadge status={employee.status} />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button className="flex-1" onClick={onEdit}>
          Редактировать
        </Button>
        <Button variant="outline" className="flex-1" onClick={onTransfer}>
          Перевести
        </Button>
      </div>

      <Section title="Контактная информация">
        <InfoRow icon={Phone} value={employee.phone} />
        <InfoRow icon={Mail} value={employee.email} />
        <InfoRow icon={Cake} value={`${formatDateShort(employee.birthDate)} (${age} лет)`} />
        <InfoRow icon={UserIcon} value="Мужской" />
        <InfoRow icon={MapPin} value={employee.address} />
      </Section>

      <Section title="Рабочая информация">
        <SummaryRow label="Должность" value={employee.position} />
        <SummaryRow label="Бригада / Отдел" value={unit} />
        <SummaryRow label="Тип занятости" value={employee.employmentType} />
        <SummaryRow label="Дата принятия" value={formatDateShort(employee.hireDate)} />
        <SummaryRow label="Стаж работы" value={formatTenure(employee.hireDate)} />
        <SummaryRow label="Оклад" value={formatCurrency(employee.salary)} />
      </Section>

      <Section title="Документы">
        <SummaryRow label="Паспорт" value={employee.passportNumber} />
        <SummaryRow label="ИНН" value={employee.inn} />
        <div className="flex items-center justify-between">
          <dt className="text-ink-secondary">Трудовой договор</dt>
          <dd>
            <button
              type="button"
              onClick={() => showToast(`Договор сотрудника ${employee.fullName} скачан`, "info")}
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              Скачать <Download size={14} />
            </button>
          </dd>
        </div>
      </Section>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 border-t border-border pt-4">
      <p className="mb-3 text-sm font-bold text-ink">{title}</p>
      <dl className="space-y-2.5 text-sm">{children}</dl>
    </div>
  );
}

function InfoRow({ icon: Icon, value }: { icon: ComponentType<{ size?: number; className?: string }>; value: string }) {
  return (
    <div className="flex items-center gap-2.5 text-ink-secondary">
      <Icon size={14} className="shrink-0 text-ink-muted" />
      <span className="min-w-0 truncate text-ink">{value}</span>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-secondary">{label}</dt>
      <dd className="text-right font-semibold text-ink">{value}</dd>
    </div>
  );
}
