import type {
  AttentionItem,
  BudgetPoint,
  DashboardKpis,
  ObjectProgressPoint,
  ObjectSummaryRow,
  PayrollSummary,
  PeriodFilter,
} from "../types";

export const dashboardKpis: DashboardKpis = {
  totalBudget: 2450000,
  spentBudget: 1680000,
  activeObjects: 12,
  inProgressObjects: 8,
  completedObjects: 4,
  payrollDebt: 84500,
  nextPayoutDate: "20 июля",
  completedWorksPercent: 92,
};

export const objectStateRows: ObjectSummaryRow[] = [
  {
    id: "obj-1",
    name: "Жилой комплекс «Сомони»",
    foreman: "Фируз Рахмонов",
    progress: 68,
    budget: 850000,
    status: "in_progress",
  },
  {
    id: "obj-2",
    name: "Бизнес-центр «Ватан»",
    foreman: "Комрон Саидов",
    progress: 42,
    budget: 620000,
    status: "at_risk",
  },
  {
    id: "obj-3",
    name: "Коттедж «Навруз»",
    foreman: "Шариф Давлатов",
    progress: 91,
    budget: 310000,
    status: "almost_done",
  },
];

export const attentionItems: AttentionItem[] = [
  {
    id: "att-1",
    title: "Заливка фундамента",
    objectName: "Жилой комплекс «Сомони»",
    responsible: "Фируз Рахмонов",
    alertLabel: "Просрочено на 3 дня",
    severity: "red",
    icon: "clock",
  },
  {
    id: "att-2",
    title: "Электромонтаж",
    objectName: "Бизнес-центр «Ватан»",
    responsible: "Комрон Саидов",
    alertLabel: "Нет подтверждения",
    severity: "orange",
    icon: "bolt",
  },
  {
    id: "att-3",
    title: "Отделочные материалы",
    objectName: "Коттедж «Навруз»",
    responsible: "Шариф Давлатов",
    alertLabel: "Остаток ниже минимума",
    severity: "orange",
    icon: "box",
  },
  {
    id: "att-4",
    title: "Бригада №3",
    objectName: "Жилой комплекс «Сомони»",
    responsible: "Фируз Рахмонов",
    alertLabel: "Не закрыта посещаемость",
    severity: "blue",
    icon: "users",
  },
];

function buildJulyBudgetSeries(): BudgetPoint[] {
  const points: BudgetPoint[] = [];
  for (let day = 1; day <= 31; day++) {
    const t = day / 31;
    const planned = Math.round(120000 + t * 850000 + Math.sin(day / 3) * 15000);
    const spent = Math.round(planned * (0.72 + Math.sin(day / 4) * 0.05));
    points.push({
      date: `${day} июл`,
      planned,
      spent,
    });
  }
  return points;
}

export const budgetSeries: BudgetPoint[] = buildJulyBudgetSeries();

function buildWeekSeries(): BudgetPoint[] {
  return budgetSeries.slice(-7);
}

function buildQuarterSeries(): BudgetPoint[] {
  const months = ["Май", "Июнь", "Июль"];
  return months.map((m, i) => ({
    date: m,
    planned: Math.round(650000 + i * 280000),
    spent: Math.round((650000 + i * 280000) * 0.74),
  }));
}

function buildYearSeries(): BudgetPoint[] {
  const months = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
  return months.map((m, i) => ({
    date: m,
    planned: Math.round(180000 + i * 62000 + Math.sin(i) * 20000),
    spent: Math.round((180000 + i * 62000) * 0.7),
  }));
}

export const budgetSeriesByPeriod: Record<PeriodFilter, BudgetPoint[]> = {
  week: buildWeekSeries(),
  month: budgetSeries,
  quarter: buildQuarterSeries(),
  year: buildYearSeries(),
};

export const objectProgressSeries: ObjectProgressPoint[] = [
  { objectName: "ЖК «Сомони»", planned: 70, actual: 68 },
  { objectName: "БЦ «Ватан»", planned: 55, actual: 42 },
  { objectName: "Коттедж «Навруз»", planned: 95, actual: 91 },
  { objectName: "Склад «Логистика»", planned: 40, actual: 25 },
  { objectName: "Школа №15", planned: 100, actual: 100 },
  { objectName: "Клиника «Шифо»", planned: 18, actual: 10 },
];

export const payrollSummary: PayrollSummary = {
  period: "Июль 2026",
  employeeCount: 46,
  accrued: 126000,
  deductions: 11500,
  toPay: 114500,
  preparedBy: "Бухгалтер — Мехринисо Каримова",
  status: "pending",
};
