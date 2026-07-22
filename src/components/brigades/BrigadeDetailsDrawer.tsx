import { Calendar, CheckCircle2, Clock, FileText, PauseCircle, Pencil, UserCog, Users, Wallet } from "lucide-react";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";
import { ObjectImage } from "../ui/ObjectImage";
import { Avatar } from "../ui/Avatar";
import { IconSummaryRow } from "../ui/IconSummaryRow";
import { BrigadeStatusBadge } from "./BrigadeStatusBadge";
import { BrigadeProgressBar } from "./BrigadeProgressBar";
import { EfficiencyCircle } from "./EfficiencyCircle";
import { EmployeeRoleBadge } from "./EmployeeRoleBadge";
import { mockEmployees } from "../../data/mockEmployees";
import { formatCurrency } from "../../utils/format";
import { formatDateShort } from "../../utils/date";
import type { Brigade } from "../../types";

interface BrigadeDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  brigade: Brigade | null;
  onEdit: (brigade: Brigade) => void;
  onChangeComposition: (brigade: Brigade) => void;
  onAssignWork: (brigade: Brigade) => void;
  onChangeForeman: (brigade: Brigade) => void;
  onPause: (id: string) => void;
  onActivate: (id: string) => void;
}

const DAILY_RATE_PER_MEMBER = 320;

export function BrigadeDetailsDrawer({
  open,
  onClose,
  brigade,
  onEdit,
  onChangeComposition,
  onAssignWork,
  onChangeForeman,
  onPause,
  onActivate,
}: BrigadeDetailsDrawerProps) {
  if (!brigade) {
    return (
      <Drawer open={open} onClose={onClose} title="Бригада">
        {null}
      </Drawer>
    );
  }

  const members = mockEmployees.filter((e) => e.brigadeId === brigade.id);
  const daysSinceCreated = Math.max(
    1,
    Math.round((new Date("2026-07-17T00:00:00").getTime() - new Date(`${brigade.createdDate}T00:00:00`).getTime()) / 86_400_000),
  );
  const totalHours = members.length * 8 * Math.min(daysSinceCreated, 90);
  const payrollCost = members.length * DAILY_RATE_PER_MEMBER * Math.min(daysSinceCreated, 30);
  const activeMembers = members.filter((m) => m.status === "on_shift" || m.status === "on_site").length;
  const attendancePercent = members.length > 0 ? Math.round((activeMembers / members.length) * 100) : 0;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={brigade.name}
      footer={
        <div className="grid w-full grid-cols-2 gap-2.5">
          <Button variant="secondary" onClick={() => onEdit(brigade)}>
            <Pencil size={14} /> Редактировать
          </Button>
          <Button variant="outline" onClick={() => onChangeComposition(brigade)}>
            <Users size={14} /> Изменить состав
          </Button>
          <Button variant="outline" onClick={() => onAssignWork(brigade)}>
            <UserCog size={14} /> Назначить на работу
          </Button>
          <Button variant="outline" onClick={() => onChangeForeman(brigade)}>
            <UserCog size={14} /> Изменить прораба
          </Button>
          {brigade.status === "paused" ? (
            <Button className="col-span-2" onClick={() => onActivate(brigade.id)}>
              <CheckCircle2 size={14} /> Активировать
            </Button>
          ) : (
            <Button className="col-span-2" variant="danger" onClick={() => onPause(brigade.id)}>
              <PauseCircle size={14} /> Поставить на паузу
            </Button>
          )}
        </div>
      }
    >
      <div className="-mx-6 -mt-5 h-40 w-auto overflow-hidden">
        <ObjectImage src={brigade.imageUrl} type={brigade.objectType} alt={brigade.objectName} />
      </div>

      <div className="mt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-ink-secondary">{brigade.specialization}</p>
            <p className="text-base font-bold text-ink">{brigade.name}</p>
          </div>
          <BrigadeStatusBadge status={brigade.status} />
        </div>

        <div className="mt-4 flex items-center gap-2.5">
          <Avatar name={brigade.foremanName} size="sm" />
          <div>
            <p className="text-xs text-ink-secondary">Прораб</p>
            <p className="text-sm font-semibold text-ink">{brigade.foremanName}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          <IconSummaryRow icon={Calendar} label="Дата создания" value={formatDateShort(brigade.createdDate)} />
          <IconSummaryRow icon={Users} label="Состав" value={`${brigade.membersCount} чел. (${brigade.workersCount} раб. / ${brigade.helpersCount} разнораб.)`} />
        </div>

        <div className="my-4 border-t border-border" />

        <div>
          <p className="text-sm font-semibold text-ink">Текущая работа</p>
          <p className="mt-1 text-sm text-ink">{brigade.currentWork}</p>
          <p className="text-xs text-ink-secondary">
            {brigade.objectName} • {brigade.sectionName}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <BrigadeProgressBar progress={brigade.workProgress} status={brigade.status} barClassName="flex-1" />
          </div>
          <p className="mt-1 text-xs text-ink-muted">Осталось {brigade.remainingDays} дней</p>
        </div>

        <div className="my-4 border-t border-border" />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">Эффективность</p>
            <p className="text-xs text-ink-secondary">За текущий период</p>
          </div>
          <EfficiencyCircle value={brigade.efficiency} size={52} strokeWidth={5} />
        </div>

        <div className="my-4 border-t border-border" />

        <div className="space-y-2.5">
          <IconSummaryRow icon={Clock} label="Отработано часов" value={`${totalHours} ч.`} />
          <IconSummaryRow icon={CheckCircle2} label="Посещаемость" value={`${attendancePercent}%`} />
          <IconSummaryRow icon={Wallet} label="Фонд оплаты труда (30 дней)" value={formatCurrency(payrollCost)} />
        </div>

        <div className="my-4 border-t border-border" />

        <div>
          <p className="text-sm font-semibold text-ink">Состав бригады ({members.length})</p>
          <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-2.5">
                <Avatar name={m.fullName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">
                    {m.fullName}{" "}
                    {m.memberRole === "foreman" && <span className="text-xs text-ink-muted">(прораб)</span>}
                    {m.memberRole === "brigadir" && <span className="text-xs text-ink-muted">(бригадир)</span>}
                  </p>
                </div>
                <EmployeeRoleBadge specialty={m.specialty} />
              </li>
            ))}
          </ul>
        </div>

        <div className="my-4 border-t border-border" />

        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
            <FileText size={14} className="text-ink-muted" /> Документы
          </p>
          <p className="text-xs text-ink-muted">Нет прикреплённых документов</p>
        </div>
      </div>
    </Drawer>
  );
}
