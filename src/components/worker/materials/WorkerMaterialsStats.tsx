import { Clock3, Package, PackageCheck, Timer } from "lucide-react";
import { WorkerCircleKpiCard } from "../WorkerCircleKpiCard";
import { useLanguage } from "../../../context/LanguageContext";
import { formatNumber } from "../../../utils/format";
import type { WorkerMaterialsKpis } from "../../../utils/workerMaterialsAnalytics";

function qtyValue(qty: number, suffix: string): string {
  return `${formatNumber(Math.round(qty))} ${suffix}`;
}

export function WorkerMaterialsStats({ kpis }: { kpis: WorkerMaterialsKpis }) {
  const { strings } = useLanguage();
  const s = strings.worker;
  const footer = (amount: number) => s.materialsKpiFooter(formatNumber(Math.round(amount)));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <WorkerCircleKpiCard icon={Package} tone="blue" title={s.materialsKpiTotalTitle} value={qtyValue(kpis.totalQty, s.materialsUnitsSuffix)} footer={footer(kpis.totalValue)} />
      <WorkerCircleKpiCard icon={PackageCheck} tone="green" title={s.materialsKpiAvailableTitle} value={qtyValue(kpis.availableQty, s.materialsUnitsSuffix)} footer={footer(kpis.availableValue)} />
      <WorkerCircleKpiCard icon={Clock3} tone="orange" title={s.materialsKpiReservedTitle} value={qtyValue(kpis.reservedQty, s.materialsUnitsSuffix)} footer={footer(kpis.reservedValue)} />
      <WorkerCircleKpiCard icon={Timer} tone="red" title={s.materialsKpiExpectedTitle} value={qtyValue(kpis.expectedQty, s.materialsUnitsSuffix)} footer={footer(kpis.expectedValue)} />
    </div>
  );
}
