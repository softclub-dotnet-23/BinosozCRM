import { Drawer } from "../ui/Drawer";
import { MaterialThumbnail } from "./MaterialThumbnail";
import { MaterialStatusBadge } from "./MaterialStatusBadge";
import { getMaterialStatus, getMaterialTotalValue } from "../../utils/materialAnalytics";
import { formatCurrency, formatNumber } from "../../utils/format";
import { formatDateShort } from "../../utils/date";
import { materialReceiptsRepository, materialWriteOffsRepository, materialTransfersRepository } from "../../data/repositories";
import { useRepositorySnapshot } from "../../hooks/useRepositoryState";
import { useLanguage } from "../../context/LanguageContext";
import type { Material } from "../../types";

export function MaterialDetailDrawer({ material, onClose }: { material: Material | null; onClose: () => void }) {
  const { strings } = useLanguage();
  const s = strings.brigadirMaterials;
  const receipts = useRepositorySnapshot(materialReceiptsRepository);
  const writeOffs = useRepositorySnapshot(materialWriteOffsRepository);
  const transfers = useRepositorySnapshot(materialTransfersRepository);

  const receiptLines = material
    ? receipts
        .flatMap((r) => r.lines.filter((l) => l.materialName === material.name).map((l) => ({ id: r.id, date: r.date, line: l })))
        .slice(0, 3)
    : [];
  const writeOffLines = material
    ? writeOffs
        .flatMap((w) => w.lines.filter((l) => l.materialName === material.name).map((l) => ({ id: w.id, date: w.date, line: l })))
        .slice(0, 3)
    : [];
  const transferLines = material
    ? transfers
        .filter((t) => t.lines.some((l) => l.materialName === material.name))
        .slice(0, 3)
    : [];

  const statusLabel: Record<ReturnType<typeof getMaterialStatus>, string> = {
    normal: s.statusNormal,
    low: s.statusLow,
    critical: s.statusCritical,
  };

  return (
    <Drawer open={Boolean(material)} onClose={onClose} title={s.drawerTitle}>
      {material && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <MaterialThumbnail src={material.imageUrl} alt={material.name} className="h-16 w-16 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-ink">{material.name}</p>
              <p className="text-sm text-ink-secondary">{material.supplier}</p>
            </div>
          </div>

          <div>
            <MaterialStatusBadge status={getMaterialStatus(material)} label={statusLabel[getMaterialStatus(material)]} />
          </div>

          <dl className="space-y-2.5 text-sm">
            <Row label={s.colCategory} value={material.category} />
            <Row label={s.warehouseLabel} value={material.warehouse} />
            <Row label={s.unitLabel} value={material.unitDetail ? `${material.unit} (${material.unitDetail})` : material.unit} />
            <Row label={s.currentStockLabel} value={`${formatNumber(material.stock)} ${material.unit}`} />
            <Row label={s.minStockLabel} value={`${formatNumber(material.minStock)} ${material.unit}`} />
            <Row label={s.priceLabel} value={formatCurrency(material.price)} />
            <Row label={s.totalValueLabel} value={formatCurrency(getMaterialTotalValue(material))} />
          </dl>

          {material.note && (
            <div className="rounded-lg bg-surface-3 px-3.5 py-2.5">
              <p className="text-xs font-semibold text-ink-secondary">{s.noteLabel}</p>
              <p className="mt-1 text-sm text-ink">{material.note}</p>
            </div>
          )}

          <Section title={s.recentReceiptsTitle}>
            {receiptLines.length > 0 ? (
              receiptLines.map(({ id, date, line }) => (
                <HistoryRow key={id} left={`+${formatNumber(line.quantity)} ${line.unit}`} right={formatDateShort(date)} tone="green" />
              ))
            ) : (
              <EmptyRow label={s.noDataLabel} />
            )}
          </Section>

          <Section title={s.recentWriteOffsTitle}>
            {writeOffLines.length > 0 ? (
              writeOffLines.map(({ id, date, line }) => (
                <HistoryRow key={id} left={`-${formatNumber(line.quantity)} ${line.unit}`} right={formatDateShort(date)} tone="red" />
              ))
            ) : (
              <EmptyRow label={s.noDataLabel} />
            )}
          </Section>

          <Section title={s.transferHistoryTitle}>
            {transferLines.length > 0 ? (
              transferLines.map((t) => (
                <HistoryRow key={t.id} left={`${t.fromWarehouse} → ${t.toWarehouse}`} right={formatDateShort(t.date)} tone="blue" />
              ))
            ) : (
              <EmptyRow label={s.noDataLabel} />
            )}
          </Section>
        </div>
      )}
    </Drawer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-secondary">{label}</dt>
      <dd className="text-right font-semibold text-ink">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border pt-4">
      <p className="mb-2.5 text-sm font-bold text-ink">{title}</p>
      <div className="space-y-1.5">{children}</div>
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

function EmptyRow({ label }: { label: string }) {
  return <p className="text-xs text-ink-muted">{label}</p>;
}
