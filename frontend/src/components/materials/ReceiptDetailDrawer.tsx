import { Building2, Calendar, Copy, Download, FileText, Pencil, Printer, RotateCcw, Trash2, Truck, User, Warehouse } from "lucide-react";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";
import { ReceiptStatusBadge } from "./InventoryStatusBadges";
import { ResponsiblePersonSummary } from "./ResponsiblePersonField";
import { formatCurrency, formatNumber } from "../../utils/format";
import { formatDateShort } from "../../utils/date";
import { receiptQuantity, receiptTotal } from "../../data/mockMaterialReceipts";
import { employeesRepository } from "../../data/repositories";
import { useRepositorySnapshot } from "../../hooks/useRepositoryState";
import { responsiblePersonName } from "../../utils/responsiblePerson";
import { useToast } from "../../hooks/useToast";
import type { MaterialReceipt } from "../../types";

interface ReceiptDetailDrawerProps {
  receipt: MaterialReceipt | null;
  onClose: () => void;
  onEdit: (receipt: MaterialReceipt) => void;
  onDuplicate: (receipt: MaterialReceipt) => void;
  onDelete: (receipt: MaterialReceipt) => void;
}

export function ReceiptDetailDrawer({ receipt, onClose, onEdit, onDuplicate, onDelete }: ReceiptDetailDrawerProps) {
  const { showToast } = useToast();
  const employees = useRepositorySnapshot(employeesRepository);

  return (
    <Drawer open={Boolean(receipt)} onClose={onClose} title="Поступление">
      {receipt && (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-ink">{receipt.documentNumber}</p>
              <p className="text-sm text-ink-secondary">Накладная № {receipt.invoiceNumber}</p>
            </div>
            <ReceiptStatusBadge status={receipt.status} />
          </div>

          <dl className="space-y-2.5 text-sm">
            <Row icon={Calendar} label="Дата поступления">
              {formatDateShort(receipt.date)}
            </Row>
            <Row icon={Truck} label="Поставщик">
              {receipt.supplier}
            </Row>
            <Row icon={Building2} label="Объект">
              {receipt.objectName}
              {receipt.brigadeName && <span className="block text-xs text-ink-muted">{receipt.brigadeName}</span>}
            </Row>
            <Row icon={Warehouse} label="Склад">
              {receipt.warehouse}
            </Row>
            <Row icon={User} label="Ответственный">
              <ResponsiblePersonSummary value={receipt.responsible} employees={employees} />
            </Row>
          </dl>

          <div className="border-t border-border pt-4">
            <p className="mb-2.5 text-sm font-bold text-ink">Материалы</p>
            <div className="space-y-2">
              {receipt.lines.map((line, i) => (
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
                Кол-во: <span className="font-semibold text-ink tabular">{formatNumber(receiptQuantity(receipt))}</span>
              </span>
              <span className="font-bold text-primary tabular">{formatCurrency(receiptTotal(receipt))}</span>
            </div>
          </div>

          {receipt.note && (
            <div className="rounded-lg bg-[#F5F5F4] px-3.5 py-2.5">
              <p className="text-xs font-semibold text-ink-secondary">Примечание</p>
              <p className="mt-1 text-sm text-ink">{receipt.note}</p>
            </div>
          )}

          <div className="border-t border-border pt-4 text-xs text-ink-muted">
            <div className="flex items-center gap-1.5">
              <FileText size={12} /> Создано {formatDateShort(receipt.createdDate)} · {responsiblePersonName(receipt.createdBy, employees)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
            <Button variant="secondary" size="sm" onClick={() => onEdit(receipt)}>
              <Pencil size={14} /> Редактировать
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onDuplicate(receipt)}>
              <Copy size={14} /> Дублировать
            </Button>
            <Button variant="secondary" size="sm" onClick={() => showToast("Печать поступления запущена", "info")}>
              <Printer size={14} /> Печать
            </Button>
            <Button variant="secondary" size="sm" onClick={() => showToast("Документ скачан", "info")}>
              <Download size={14} /> Скачать
            </Button>
            <Button variant="secondary" size="sm" onClick={() => showToast("Форма возврата пока в разработке", "info")}>
              <RotateCcw size={14} /> Создать возврат
            </Button>
            <Button variant="danger" size="sm" onClick={() => onDelete(receipt)}>
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
