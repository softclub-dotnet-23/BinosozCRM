import { ArrowRight, Ban, Building2, Calendar, Copy, FileText, Pencil, Printer, Trash2, User } from "lucide-react";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";
import { TransferStatusBadge } from "./InventoryStatusBadges";
import { formatCurrency, formatNumber } from "../../utils/format";
import { formatDateShort } from "../../utils/date";
import { transferQuantity, transferTotal } from "../../data/mockMaterialTransfers";
import { useToast } from "../../hooks/useToast";
import type { MaterialTransfer } from "../../types";

interface TransferDetailDrawerProps {
  transfer: MaterialTransfer | null;
  onClose: () => void;
  onEdit: (transfer: MaterialTransfer) => void;
  onDuplicate: (transfer: MaterialTransfer) => void;
  onCancel: (transfer: MaterialTransfer) => void;
  onDelete: (transfer: MaterialTransfer) => void;
}

export function TransferDetailDrawer({ transfer, onClose, onEdit, onDuplicate, onCancel, onDelete }: TransferDetailDrawerProps) {
  const { showToast } = useToast();
  return (
    <Drawer open={Boolean(transfer)} onClose={onClose} title="Перемещение">
      {transfer && (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-ink">{transfer.documentNumber}</p>
              <p className="flex items-center gap-1.5 text-sm text-ink-secondary">
                {transfer.fromWarehouse} <ArrowRight size={13} /> {transfer.toWarehouse}
              </p>
            </div>
            <TransferStatusBadge status={transfer.status} />
          </div>

          <dl className="space-y-2.5 text-sm">
            <Row icon={Calendar} label="Дата перемещения">
              {formatDateShort(transfer.date)}
            </Row>
            {transfer.objectName && (
              <Row icon={Building2} label="Объект">
                {transfer.objectName}
              </Row>
            )}
            <Row icon={User} label="Ответственный">
              {transfer.responsible}
            </Row>
          </dl>

          {transfer.basis && (
            <div className="rounded-lg bg-[#F5F5F4] px-3.5 py-2.5">
              <p className="text-xs font-semibold text-ink-secondary">Основание</p>
              <p className="mt-1 text-sm text-ink">{transfer.basis}</p>
            </div>
          )}

          <div className="border-t border-border pt-4">
            <p className="mb-2.5 text-sm font-bold text-ink">Материалы</p>
            <div className="space-y-2">
              {transfer.lines.map((line, i) => (
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
            <div className="mt-3 flex items-center justify-between rounded-[10px] bg-primary-soft px-4 py-3 text-sm">
              <span className="text-ink-secondary">
                Кол-во: <span className="font-semibold text-ink tabular">{formatNumber(transferQuantity(transfer))}</span>
              </span>
              <span className="font-bold text-primary tabular">{formatCurrency(transferTotal(transfer))}</span>
            </div>
          </div>

          {transfer.note && (
            <div className="rounded-lg bg-[#F5F5F4] px-3.5 py-2.5">
              <p className="text-xs font-semibold text-ink-secondary">Примечание</p>
              <p className="mt-1 text-sm text-ink">{transfer.note}</p>
            </div>
          )}

          <div className="border-t border-border pt-4 text-xs text-ink-muted">
            <div className="flex items-center gap-1.5">
              <FileText size={12} /> Создано {formatDateShort(transfer.createdDate)} · {transfer.createdBy}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
            <Button variant="secondary" size="sm" onClick={() => onEdit(transfer)}>
              <Pencil size={14} /> Редактировать
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onDuplicate(transfer)}>
              <Copy size={14} /> Дублировать
            </Button>
            <Button variant="secondary" size="sm" onClick={() => showToast("Печать перемещения запущена", "info")}>
              <Printer size={14} /> Печать
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onCancel(transfer)}
              disabled={transfer.status === "cancelled"}
            >
              <Ban size={14} /> Отменить
            </Button>
            <Button variant="danger" size="sm" className="col-span-2" onClick={() => onDelete(transfer)}>
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
