import { Camera, Mail, Pencil, Phone } from "lucide-react";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { Avatar } from "../../ui/Avatar";
import { useLanguage } from "../../../context/LanguageContext";
import { cn } from "../../../utils/cn";
import type { Employee } from "../../../types";

const INACTIVE_STATUSES = new Set<Employee["status"]>(["absent", "sick_leave", "on_leave"]);

interface ProfileIdentityCardProps {
  employee: Employee;
  email: string | undefined;
  onEdit: () => void;
  onChangePhoto: () => void;
}

export function ProfileIdentityCard({ employee, email, onEdit, onChangePhoto }: ProfileIdentityCardProps) {
  const { strings } = useLanguage();
  const s = strings.worker;
  const isActive = !INACTIVE_STATUSES.has(employee.status);

  return (
    <Card className="p-4">
      <div className="flex flex-col items-center text-center">
        <Avatar name={employee.fullName} src={employee.avatarUrl} className="h-28 w-28 text-3xl" />
        <p className="mt-3 text-base font-bold text-ink">{employee.fullName}</p>
        <p className="text-sm text-ink-secondary">{strings.common.roleLabels.worker}</p>

        <div className="mt-3 flex w-full flex-col items-stretch gap-2 text-sm">
          <a href={`tel:${employee.phone.replace(/\s+/g, "")}`} className="flex items-center justify-center gap-2 text-ink-secondary hover:text-ink">
            <Phone size={14} />
            {employee.phone}
          </a>
          {email && (
            <a href={`mailto:${email}`} className="flex items-center justify-center gap-2 text-ink-secondary hover:text-ink">
              <Mail size={14} />
              {email}
            </a>
          )}
        </div>

        <span className={cn("mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", isActive ? "bg-green-soft text-green" : "bg-surface-4 text-ink-secondary")}>
          <span className={cn("h-1.5 w-1.5 rounded-full", isActive ? "bg-green" : "bg-ink-muted")} />
          {isActive ? s.profileStatusActive : s.profileStatusInactive}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <Button className="w-full" onClick={onEdit}>
          <Pencil size={15} />
          {s.profileEditButton}
        </Button>
        <Button variant="outline" className="w-full" onClick={onChangePhoto}>
          <Camera size={15} />
          {s.profileChangePhotoButton}
        </Button>
      </div>
    </Card>
  );
}
