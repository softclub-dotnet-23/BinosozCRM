import { Building2, Calendar, FileText, Pencil, Trash2, User, Warehouse } from "lucide-react";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";
import { ReviewStatusBadge, writeOffReasonLabel } from "./InventoryStatusBadges";
import { formatCurrency, formatNumber } from "../../utils/format";
import { formatDateShort } from "../../utils/date";
import { writeOffQuantity, writeOffTotal } from "../../data/mockMaterialWriteOffs";
import type { MaterialWriteOff } from "../../types";

interface WriteOffDetailDrawerProps {
  writeOff: MaterialWriteOff | null;
  onClose: () => void;
  onEdit: (writeOff: MaterialWriteOff) => void;
  onDelete: (writeOff: MaterialWriteOff) => void;
}

export function WriteOffDetailDrawer({ writeOff, onClose, onEdit, onDelete }: WriteOffDetailDrawerProps) {
  return (
    <Drawer open={Boolean(writeOff)} onClose={onClose} title="Списание">
      {writeOff && (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-ink">{writeOff.documentNumber}</p>
              <p className="text-sm text-ink-secondary">{writeOffReasonLabel(writeOff.reason)}</p>
            </div>
            <ReviewStatusBadge requiresReview={writeOff.requiresReview} />
          </div>

          <dl className="space-y-2.5 text-sm">
            <Row icon={Calendar} label="Дата списания">
              {formatDateShort(writeOff.date)}
            </Row>
            <Row icon={Building2} label="Объект">
              {writeOff.objectName}
              {writeOff.brigadeName && <span className="block text-xs text-ink-muted">{writeOff.brigadeName}</span>}
            </Row>
            <Row icon={Warehouse} label="Склад">
              {writeOff.warehouse}
            </Row>
            <Row icon={User} label="Ответственный">
              {writeOff.responsible}
            </Row>
          </dl>

          {writeOff.basis && (
            <div className="rounded-lg bg-[#F5F5F4] px-3.5 py-2.5">
              <p className="text-xs font-semibold text-ink-secondary">Основание</p>
              <p className="mt-1 text-sm text-ink">{writeOff.basis}</p>
            </div>
          )}

          <div className="border-t border-border pt-4">
            <p className="mb-2.5 text-sm font-bold text-ink">Материалы</p>
            <div className="space-y-2">
              {writeOff.lines.map((line, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-[#F5F5F4] px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{line.materialName}</p>
                    <p className="text-xs text-ink-muted">
                      {formatNumber(line.quantity)} {line.unit} × {formatNumber(line.price)}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold text-ink tabular">{formatCurrency(line.lineTotal)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-[10px] bg-red-soft px-4 py-3 text-sm">
              <span className="text-ink-secondary">
                Кол-во: <span className="font-semibold text-ink tabular">{formatNumber(writeOffQuantity(writeOff))}</span>
              </span>
              <span className="font-bold text-red tabular">-{formatCurrency(writeOffTotal(writeOff))}</span>
            </div>
          </div>

          {writeOff.note && (
            <div className="rounded-lg bg-[#F5F5F4] px-3.5 py-2.5">
              <p className="text-xs font-semibold text-ink-secondary">Примечание</p>
              <p className="mt-1 text-sm text-ink">{writeOff.note}</p>
            </div>
          )}

          <div className="border-t border-border pt-4 text-xs text-ink-muted">
            <div className="flex items-center gap-1.5">
              <FileText size={12} /> Создано {formatDateShort(writeOff.createdDate)} · {writeOff.createdBy}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
            <Button variant="secondary" size="sm" onClick={() => onEdit(writeOff)}>
              <Pencil size={14} /> Редактировать
            </Button>
            <Button variant="danger" size="sm" onClick={() => onDelete(writeOff)}>
              <Trash2 size={14} /> Удалить
            </Button>
          </div>
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
