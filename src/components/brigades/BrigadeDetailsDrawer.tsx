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
import { useLanguage } from "../../context/LanguageContext";
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
  const { strings } = useLanguage();
  const s = strings.brigades;
  const c = strings.common;

  if (!brigade) {
    return (
      <Drawer open={open} onClose={onClose} title={s.detailsDefaultTitle}>
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
            <Pencil size={14} /> {c.edit}
          </Button>
          <Button variant="outline" onClick={() => onChangeComposition(brigade)}>
            <Users size={14} /> {s.actionChangeComposition}
          </Button>
          <Button variant="outline" onClick={() => onAssignWork(brigade)}>
            <UserCog size={14} /> {s.actionAssignWork}
          </Button>
          <Button variant="outline" onClick={() => onChangeForeman(brigade)}>
            <UserCog size={14} /> {s.actionChangeForeman}
          </Button>
          {brigade.status === "paused" ? (
            <Button className="col-span-2" onClick={() => onActivate(brigade.id)}>
              <CheckCircle2 size={14} /> {s.actionActivate}
            </Button>
          ) : (
            <Button className="col-span-2" variant="danger" onClick={() => onPause(brigade.id)}>
              <PauseCircle size={14} /> {s.actionPauseBrigade}
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
            <p className="text-xs text-ink-secondary">{c.roleLabels.prorab}</p>
            <p className="text-sm font-semibold text-ink">{brigade.foremanName}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          <IconSummaryRow icon={Calendar} label={s.fieldCreatedDate} value={formatDateShort(brigade.createdDate)} />
          <IconSummaryRow
            icon={Users}
            label={s.colComposition}
            value={s.compositionLabel(brigade.membersCount, brigade.workersCount, brigade.helpersCount)}
          />
        </div>

        <div className="my-4 border-t border-border" />

        <div>
          <p className="text-sm font-semibold text-ink">{s.fieldCurrentWork}</p>
          <p className="mt-1 text-sm text-ink">{brigade.currentWork}</p>
          <p className="text-xs text-ink-secondary">
            {brigade.objectName} • {brigade.sectionName}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <BrigadeProgressBar progress={brigade.workProgress} status={brigade.status} barClassName="flex-1" />
          </div>
          <p className="mt-1 text-xs text-ink-muted">{s.remainingDaysPlain(brigade.remainingDays)}</p>
        </div>

        <div className="my-4 border-t border-border" />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">{s.efficiencyLabel}</p>
            <p className="text-xs text-ink-secondary">{s.kpiCurrentPeriodFooter}</p>
          </div>
          <EfficiencyCircle value={brigade.efficiency} size={52} strokeWidth={5} />
        </div>

        <div className="my-4 border-t border-border" />

        <div className="space-y-2.5">
          <IconSummaryRow icon={Clock} label={s.hoursWorkedTitle} value={s.hoursWorkedLabel(totalHours)} />
          <IconSummaryRow icon={CheckCircle2} label={s.attendanceTitle} value={`${attendancePercent}%`} />
          <IconSummaryRow icon={Wallet} label={s.payrollFundTitle} value={formatCurrency(payrollCost)} />
        </div>

        <div className="my-4 border-t border-border" />

        <div>
          <p className="text-sm font-semibold text-ink">{s.compositionCountTitle(members.length)}</p>
          <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-2.5">
                <Avatar name={m.fullName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">
                    {m.fullName}{" "}
                    {m.memberRole === "foreman" && <span className="text-xs text-ink-muted">{s.foremanTag}</span>}
                    {m.memberRole === "brigadir" && <span className="text-xs text-ink-muted">{s.brigadirTag}</span>}
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
            <FileText size={14} className="text-ink-muted" /> {s.documentsTitle}
          </p>
          <p className="text-xs text-ink-muted">{s.noDocuments}</p>
        </div>
      </div>
    </Drawer>
  );
}
