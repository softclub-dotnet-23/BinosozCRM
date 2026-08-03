import { useNavigate } from "react-router-dom";
import { Boxes, Calendar, Download, Layers, Lock, Package, Pencil, Tag, Warehouse } from "lucide-react";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";
import { MaterialThumbnail } from "./MaterialThumbnail";
import { MaterialStatusBadge } from "./MaterialStatusBadge";
import {
  materialReceiptsRepository,
  materialWriteOffsRepository,
  materialTransfersRepository,
  materialsRepository,
  stockReservationsRepository,
  stockAdjustmentsRepository,
  employeesRepository,
} from "../../data/repositories";
import { useRepositorySnapshot } from "../../hooks/useRepositoryState";
import { responsiblePersonName } from "../../utils/responsiblePerson";
import { formatCurrency, formatNumber } from "../../utils/format";
import { formatDateShort, formatDateTimeShort } from "../../utils/date";
import { useToast } from "../../hooks/useToast";
import type { MaterialStockRow } from "../../types";

interface StockDetailDrawerProps {
  row: MaterialStockRow | null;
  onClose: () => void;
  onAdjust: (row: MaterialStockRow) => void;
  onReserve: (row: MaterialStockRow) => void;
  onReleaseReservation: (reservationId: string) => void;
}

export function StockDetailDrawer({ row, onClose, onAdjust, onReserve, onReleaseReservation }: StockDetailDrawerProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const materials = useRepositorySnapshot(materialsRepository);
  const receipts = useRepositorySnapshot(materialReceiptsRepository);
  const writeOffs = useRepositorySnapshot(materialWriteOffsRepository);
  const transfers = useRepositorySnapshot(materialTransfersRepository);
  const reservations = useRepositorySnapshot(stockReservationsRepository);
  const adjustments = useRepositorySnapshot(stockAdjustmentsRepository);
  const employees = useRepositorySnapshot(employeesRepository);

  const material = row ? materials.find((m) => m.id === row.id) : undefined;

  const receiptLines = row
    ? receipts
        .flatMap((r) => r.lines.filter((l) => l.materialName === row.materialName).map((l) => ({ id: r.id, date: r.date, line: l })))
        .slice(0, 3)
    : [];
  const writeOffLines = row
    ? writeOffs
        .flatMap((w) => w.lines.filter((l) => l.materialName === row.materialName).map((l) => ({ id: w.id, date: w.date, line: l })))
        .slice(0, 3)
    : [];
  const transferRows = row ? transfers.filter((t) => t.lines.some((l) => l.materialName === row.materialName)).slice(0, 3) : [];
  const materialReservations = row
    ? reservations.filter((res) => res.materialName === row.materialName && res.warehouse === row.warehouse).slice(0, 5)
    : [];
  const materialAdjustments = row
    ? adjustments
        .filter((a) => a.materialName === row.materialName && a.warehouse === row.warehouse)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 5)
    : [];

  function handleExportHistory() {
    if (!row) return;
    const header = ["Тип", "Дата", "Количество", "Кто/примечание"];
    const rows: (string | number)[][] = [
      ...receiptLines.map(({ date, line }) => ["Поступление", formatDateShort(date), `+${line.quantity}`, line.materialName]),
      ...writeOffLines.map(({ date, line }) => ["Списание", formatDateShort(date), `-${line.quantity}`, line.materialName]),
      ...transferRows.map((t) => ["Перемещение", formatDateShort(t.date), "", `${t.fromWarehouse} → ${t.toWarehouse}`]),
      ...materialAdjustments.map((a) => [
        "Корректировка",
        formatDateShort(a.date),
        a.resultingQuantity - a.previousQuantity,
        a.reason,
      ]),
      ...materialReservations.map((r) => [
        r.status === "active" ? "Резерв" : "Резерв снят",
        formatDateShort(r.date),
        r.quantity,
        r.objectName ?? "",
      ]),
    ];
    const csv = [header, ...rows]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ostatok-${row.materialName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("История остатка экспортирована");
  }

  return (
    <Drawer open={Boolean(row)} onClose={onClose} title="Остаток материала">
      {row && material && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <MaterialThumbnail src={material.imageUrl} alt={material.name} className="h-16 w-16 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-ink">{material.name}</p>
              <p className="text-sm text-ink-secondary">{material.supplier}</p>
            </div>
          </div>

          <div>
            <MaterialStatusBadge status={row.status} />
          </div>

          <dl className="space-y-2.5 text-sm">
            <Row icon={Tag} label="Категория">
              {row.category}
            </Row>
            <Row icon={Warehouse} label="Склад">
              {row.warehouse}
            </Row>
            <Row icon={Package} label="Единица измерения">
              {material.unitDetail ? `${row.unit} (${material.unitDetail})` : row.unit}
            </Row>
            <Row icon={Boxes} label="Текущий остаток">
              {formatNumber(row.quantity)} {row.unit}
            </Row>
            <Row icon={Lock} label="Зарезервировано">
              {formatNumber(row.reserved)} {row.unit}
            </Row>
            <Row icon={Layers} label="Доступно">
              {formatNumber(row.available)} {row.unit}
            </Row>
            <Row icon={Boxes} label="Минимальный остаток">
              {formatNumber(row.minStock)} {row.unit}
            </Row>
            <Row icon={Calendar} label="Последнее обновление">
              {formatDateTimeShort(row.updatedAt)}
            </Row>
          </dl>

          <div className="flex items-center justify-between rounded-[10px] bg-[#F5F5F4] px-4 py-3 text-sm">
            <span className="text-ink-secondary">
              Цена: <span className="font-semibold text-ink tabular">{formatCurrency(row.price)}</span>
            </span>
            <span className="font-bold text-ink tabular">{formatCurrency(row.price * row.quantity)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
            <Button variant="secondary" size="sm" onClick={() => onAdjust(row)}>
              <Pencil size={14} /> Корректировать остаток
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onReserve(row)}>
              <Lock size={14} /> Зарезервировать
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate("/inventory/receipts")}>
              Создать поступление
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate("/inventory/write-offs")}>
              Создать списание
            </Button>
            <Button variant="secondary" size="sm" className="col-span-2" onClick={() => navigate("/inventory/transfers")}>
              Переместить
            </Button>
            <Button variant="outline" size="sm" className="col-span-2" onClick={handleExportHistory}>
              <Download size={14} /> Экспорт истории
            </Button>
          </div>

          <Section title="Последние поступления">
            {receiptLines.length > 0 ? (
              receiptLines.map(({ id, date, line }) => (
                <HistoryRow key={id} left={`+${formatNumber(line.quantity)} ${line.unit}`} right={formatDateShort(date)} tone="green" />
              ))
            ) : (
              <EmptyRow />
            )}
          </Section>

          <Section title="Последние списания">
            {writeOffLines.length > 0 ? (
              writeOffLines.map(({ id, date, line }) => (
                <HistoryRow key={id} left={`-${formatNumber(line.quantity)} ${line.unit}`} right={formatDateShort(date)} tone="red" />
              ))
            ) : (
              <EmptyRow />
            )}
          </Section>

          <Section title="История перемещений">
            {transferRows.length > 0 ? (
              transferRows.map((t) => (
                <HistoryRow key={t.id} left={`${t.fromWarehouse} → ${t.toWarehouse}`} right={formatDateShort(t.date)} tone="blue" />
              ))
            ) : (
              <EmptyRow />
            )}
          </Section>

          <Section title="История корректировок">
            {materialAdjustments.length > 0 ? (
              materialAdjustments.map((a) => (
                <div key={a.id} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink">
                      {formatNumber(a.previousQuantity)} → {formatNumber(a.resultingQuantity)} {row.unit}
                    </span>
                    <span className="text-xs text-ink-muted">{formatDateShort(a.date)}</span>
                  </div>
                  <p className="text-xs text-ink-muted">
                    {a.reason} · {responsiblePersonName(a.responsible, employees)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyRow />
            )}
          </Section>

          <Section title="Резервы">
            {materialReservations.length > 0 ? (
              materialReservations.map((r) => (
                <div key={r.id} className="flex items-start justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className={r.status === "active" ? "font-semibold text-ink" : "text-ink-muted line-through"}>
                      {formatNumber(r.quantity)} {row.unit}
                      {r.objectName ? ` · ${r.objectName}` : ""}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {formatDateShort(r.date)} · {responsiblePersonName(r.responsible, employees)}
                    </p>
                  </div>
                  {r.status === "active" && (
                    <button
                      type="button"
                      onClick={() => onReleaseReservation(r.id)}
                      className="shrink-0 text-xs font-semibold text-primary hover:text-primary-hover"
                    >
                      Снять резерв
                    </button>
                  )}
                </div>
              ))
            ) : (
              <EmptyRow />
            )}
          </Section>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border pt-4">
      <p className="mb-2.5 text-sm font-bold text-ink">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function HistoryRow({ left, right, tone }: { left: string; right: string; tone: "green" | "red" | "blue" }) {
  const toneClass = tone === "green" ? "text-green" : tone === "red" ? "text-red" : "text-blue";
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={`font-semibold ${toneClass}`}>{left}</span>
      <span className="text-xs text-ink-muted">{right}</span>
    </div>
  );
}

function EmptyRow() {
  return <p className="text-xs text-ink-muted">Нет данных</p>;
}
