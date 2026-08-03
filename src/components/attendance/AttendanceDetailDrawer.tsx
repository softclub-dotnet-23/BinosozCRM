import { Building2, Calendar, Clock, MapPin } from "lucide-react";
import { Drawer } from "../ui/Drawer";
import { Avatar } from "../ui/Avatar";
import { AttendanceStatusBadge } from "./AttendanceStatusBadge";
import { formatDateShort, formatWeekdayShort } from "../../utils/date";
import type { AttendanceRecord } from "../../types";

export function AttendanceDetailDrawer({ record, onClose }: { record: AttendanceRecord | null; onClose: () => void }) {
  return (
    <Drawer open={Boolean(record)} onClose={onClose} title="Посещение">
      {record && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Avatar name={record.employeeName} className="h-14 w-14 text-lg" />
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-ink">{record.employeeName}</p>
              <p className="text-sm text-ink-secondary">{record.position}</p>
            </div>
          </div>

          <div>
            <AttendanceStatusBadge status={record.status} />
          </div>

          <dl className="space-y-3 text-sm">
            <Row icon={Calendar} label="Дата">
              {formatDateShort(record.date)} ({formatWeekdayShort(record.date)})
            </Row>
            <Row icon={Building2} label="Бригада / Отдел">
              {record.brigadeName ?? record.department ?? "—"}
              {record.brigadeSpecialization && <span className="block text-xs text-ink-muted">{record.brigadeSpecialization}</span>}
            </Row>
            <Row icon={MapPin} label="Объект">
              {record.objectName}
              <span className="block text-xs text-ink-muted">{record.city}</span>
            </Row>
            <Row icon={Clock} label="Приход / Уход">
              {record.arrivalTime ?? "—"} — {record.departureTime ?? "—"}
            </Row>
          </dl>

          {record.note && (
            <div className="rounded-lg bg-[#F5F5F4] px-3.5 py-2.5">
              <p className="text-xs font-semibold text-ink-secondary">Примечание</p>
              <p className="mt-1 text-sm text-ink">{record.note}</p>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}

function Row({ icon: Icon, label, children }: { icon: typeof Calendar; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={14} className="mt-0.5 shrink-0 text-ink-muted" />
      <div className="min-w-0">
        <dt className="text-xs text-ink-secondary">{label}</dt>
        <dd className="text-ink">{children}</dd>
      </div>
    </div>
  );
}
