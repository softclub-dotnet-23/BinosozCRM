import { useEffect, useMemo, useRef, useState } from "react";
import { format, startOfMonth } from "date-fns";
import { AlertCircle, BarChart3, Loader2, Wallet } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { DonutChart } from "../components/charts/DonutChart";
import { CategoryLegend } from "../components/charts/CategoryLegend";
import { ApiError, NetworkError } from "../api/apiClient";
import { getActualCostReport, type ActualCostLine, type ActualCostReport } from "../api/reportsApi";
import { formatCompactCurrency, formatCurrency } from "../utils/format";
import type { CategorySpend } from "../types";

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) {
    if (error.status === 401) return "Сессия истекла. Войдите в систему заново.";
    if (error.status === 403) return "У вас нет прав для просмотра этого отчёта.";
    return error.message || fallback;
  }
  return fallback;
}

const today = new Date();
const DEFAULT_PERIOD_START = format(startOfMonth(today), "yyyy-MM-dd");
const DEFAULT_PERIOD_END = format(today, "yyyy-MM-dd");

type LoadState = "loading" | "ready" | "validation" | "error";

/**
 * GET /reports/actual-cost — Owner sees the whole company, Prorab sees only
 * their authorized object scope (the backend itself omits General and
 * other-object lines for a restricted Prorab; this page renders exactly
 * what comes back and never re-filters it, per the report's own
 * authorization guarantee). All figures are backend-computed — no payroll
 * or cost math happens here.
 */
export default function ReportsPage() {
  const [periodStart, setPeriodStart] = useState(DEFAULT_PERIOD_START);
  const [periodEnd, setPeriodEnd] = useState(DEFAULT_PERIOD_END);
  const [report, setReport] = useState<ActualCostReport | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  async function loadReport(start: string, end: string) {
    if (!start || !end) {
      setLoadError("Укажите начало и конец периода");
      setLoadState("validation");
      return;
    }
    if (end < start) {
      setLoadError("Конец периода не может быть раньше начала");
      setLoadState("validation");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoadState("loading");
    setLoadError("");
    try {
      const result = await getActualCostReport(start, end, controller.signal);
      setReport(result);
      setLoadState("ready");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (error instanceof ApiError && error.code === "VALIDATION_FAILED") {
        setLoadError(describeError(error, "Проверьте период отчёта"));
        setLoadState("validation");
        return;
      }
      setLoadError(describeError(error, "Не удалось загрузить отчёт"));
      setLoadState("error");
    }
  }

  useEffect(() => {
    void loadReport(periodStart, periodEnd);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodStart, periodEnd]);

  const kpis = useMemo(() => ({
    total: report?.totalCost ?? 0,
    lines: report?.lines.length ?? 0,
  }), [report]);

  // Only 3 categories exist in the actual-cost domain model — there is no
  // equipment-rental or transport cost anywhere in the backend. Amounts sum
  // to each line's own TotalCost = Material + Piecework + Hourly + Bonus −
  // Advance − Lateness + Adjustment (GetActualCostReportQuery.cs), so the
  // 3 buckets below reconstruct that same total exactly. A bucket is
  // dropped rather than shown negative if deductions exceed the underlying
  // cost — a donut slice can't represent a negative share.
  const expenseStructure: CategorySpend[] = useMemo(() => {
    if (!report) return [];
    const material = report.lines.reduce((sum, line) => sum + line.materialCost, 0);
    const payroll = report.lines.reduce(
      (sum, line) => sum + line.pieceworkCost + line.hourlyCost + line.bonusAmount - line.advanceDeductedAmount - line.latenessDeductionAmount,
      0,
    );
    const other = report.lines.reduce((sum, line) => sum + line.adjustmentAmount, 0);
    return [
      { category: "Материалы", amount: material, color: "var(--color-green)" },
      { category: "Зарплаты", amount: payroll, color: "var(--color-primary)" },
      { category: "Прочие", amount: other, color: "var(--color-ink-muted)" },
    ].filter((entry) => entry.amount > 0);
  }, [report]);

  const columns: DataTableColumn<ActualCostLine>[] = [
    {
      key: "object",
      header: "Объект",
      render: (row) =>
        row.objectId === null ? (
          <Badge tone="purple">{row.objectName}</Badge>
        ) : (
          <span className="font-semibold text-ink">{row.objectName}</span>
        ),
    },
    { key: "material", header: "Материалы", render: (row) => <span className="tabular text-ink-secondary">{formatCurrency(row.materialCost)}</span> },
    { key: "piecework", header: "Сдельная", render: (row) => <span className="tabular text-ink-secondary">{formatCurrency(row.pieceworkCost)}</span> },
    { key: "hourly", header: "Почасовая", render: (row) => <span className="tabular text-ink-secondary">{formatCurrency(row.hourlyCost)}</span> },
    { key: "bonus", header: "Премия", render: (row) => <span className="tabular text-ink-secondary">{formatCurrency(row.bonusAmount)}</span> },
    { key: "advance", header: "Вычет аванса", render: (row) => <span className="tabular text-red">{formatCurrency(row.advanceDeductedAmount)}</span> },
    { key: "lateness", header: "Вычет опозданий", render: (row) => <span className="tabular text-red">{formatCurrency(row.latenessDeductionAmount)}</span> },
    { key: "adjustment", header: "Корректировка", render: (row) => <span className="tabular text-ink-secondary">{formatCurrency(row.adjustmentAmount)}</span> },
    { key: "total", header: "Итого", headerClassName: "text-right", className: "text-right", render: (row) => <span className="tabular font-semibold text-ink">{formatCurrency(row.totalCost)}</span> },
  ];

  return (
    <AppLayout title="Отчёты" subtitle="Фактическая стоимость по объектам за период">
      <Card style={{ padding: 16 }}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1.5 block text-ink-secondary">Начало периода</span>
            <input type="date" value={periodStart} max={periodEnd || undefined} onChange={(e) => setPeriodStart(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-ink-secondary">Конец периода</span>
            <input type="date" value={periodEnd} min={periodStart || undefined} onChange={(e) => setPeriodEnd(e.target.value)} />
          </label>
          <Button variant="secondary" size="sm" onClick={() => void loadReport(periodStart, periodEnd)} disabled={loadState === "loading"}>
            Обновить
          </Button>
        </div>
      </Card>

      {loadState === "validation" && (
        <Card style={{ marginTop: 16, padding: 16 }}>
          <div className="flex items-center gap-2 text-sm text-red" role="alert"><AlertCircle size={16} /><span>{loadError}</span></div>
        </Card>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard label="Итого за период" value={formatCurrency(kpis.total)} icon={Wallet} tone="orange" footer="Сумма по всем строкам отчёта" />
        <MetricCard label="Строк в отчёте" value={String(kpis.lines)} icon={BarChart3} tone="blue" footer="Объекты и «Общие»" />
      </div>

      {loadState === "ready" && report && (
        <Card className="mt-4 p-5 sm:p-6">
          <h2 className="text-[17px] font-bold text-ink">Структура расходов</h2>
          {expenseStructure.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">Нет расходов за выбранный период</p>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
              <DonutChart
                data={expenseStructure}
                centerLabel="Расходы"
                centerValue={formatCompactCurrency(expenseStructure.reduce((sum, entry) => sum + entry.amount, 0))}
                size={200}
              />
              <CategoryLegend data={expenseStructure} unitSuffix=" сомони" secondaryOrder="percent-first" />
            </div>
          )}
        </Card>
      )}

      {loadState === "error" && (
        <Card className="mt-4 p-0">
          <ErrorState
            title={loadError}
            action={<Button size="sm" variant="secondary" onClick={() => void loadReport(periodStart, periodEnd)}>Повторить</Button>}
          />
        </Card>
      )}

      {loadState === "loading" && (
        <Card style={{ marginTop: 16, padding: 40, textAlign: "center" }}><Loader2 size={22} className="animate-spin" style={{ margin: "0 auto" }} /></Card>
      )}

      {loadState === "ready" && report && (
        <Card className="mt-4">
          <div className="mt-4">
            {report.lines.length > 0 ? (
              <DataTable columns={columns} rows={report.lines} rowKey={(row) => row.objectId ?? "general"} />
            ) : (
              <EmptyState icon={BarChart3} title="Нет данных за выбранный период" description="Измените период — данные появятся, когда за него будут закрытые начисления или поступления материалов" />
            )}
          </div>
        </Card>
      )}
    </AppLayout>
  );
}
