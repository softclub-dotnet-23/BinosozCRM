import { mockObjects } from "./mockObjects";
import type { BudgetLine, BudgetOperation, CategorySpend, RiskItem } from "../types";

function findObject(id: string) {
  const object = mockObjects.find((o) => o.id === id);
  if (!object) throw new Error(`Unknown mock object id: ${id}`);
  return object;
}

interface RawBudgetLine {
  objectId: string;
  totalBudget: number;
  spent: number;
  status: BudgetLine["status"];
  updatedDate: string;
}

const RAW_BUDGET_LINES: RawBudgetLine[] = [
  { objectId: "obj-1", totalBudget: 850000, spent: 578000, status: "in_progress", updatedDate: "2026-07-28" },
  { objectId: "obj-2", totalBudget: 620000, spent: 445000, status: "over_budget", updatedDate: "2026-07-27" },
  { objectId: "obj-3", totalBudget: 310000, spent: 282000, status: "completed", updatedDate: "2026-07-26" },
  { objectId: "obj-4", totalBudget: 1250000, spent: 390000, status: "pending_approval", updatedDate: "2026-07-25" },
  { objectId: "obj-5", totalBudget: 210000, spent: 225000, status: "over_budget", updatedDate: "2026-07-20" },
  { objectId: "obj-6", totalBudget: 750000, spent: 95000, status: "draft", updatedDate: "2026-07-25" },
  { objectId: "obj-7", totalBudget: 980000, spent: 512000, status: "in_progress", updatedDate: "2026-07-22" },
  { objectId: "obj-8", totalBudget: 180000, spent: 61000, status: "in_progress", updatedDate: "2026-07-18" },
  { objectId: "obj-9", totalBudget: 540000, spent: 468000, status: "in_progress", updatedDate: "2026-07-19" },
  { objectId: "obj-10", totalBudget: 690000, spent: 298000, status: "in_progress", updatedDate: "2026-07-21" },
  { objectId: "obj-11", totalBudget: 430000, spent: 421000, status: "completed", updatedDate: "2026-06-15" },
  { objectId: "obj-12", totalBudget: 860000, spent: 501000, status: "in_progress", updatedDate: "2026-07-23" },
];

export const mockBudgetLines: BudgetLine[] = RAW_BUDGET_LINES.map((raw) => {
  const object = findObject(raw.objectId);
  return {
    id: `budget-${raw.objectId}`,
    objectId: object.id,
    objectName: object.name,
    objectType: object.objectType,
    imageUrl: object.imageUrl,
    totalBudget: raw.totalBudget,
    spent: raw.spent,
    status: raw.status,
    responsible: object.foreman,
    responsibleRole: "Прораб",
    periodStart: object.startDate,
    periodEnd: object.deadline,
    createdDate: object.startDate,
    updatedDate: raw.updatedDate,
  };
});

export const budgetKpis = {
  totalBudget: 4680000,
  approvedBudget: 3920000,
  approvedPercent: 84,
  actualSpent: 2745000,
  actualSpentPercent: 59,
  overBudgetAmount: 125000,
  overBudgetObjectCount: 2,
};

export const budgetCategorySpend: CategorySpend[] = [
  { category: "Строительные работы", amount: 2574000, color: "#2869C9" },
  { category: "Материалы", amount: 1170000, color: "#FF6B00" },
  { category: "Оборудование", amount: 468000, color: "#F58A1F" },
  { category: "Непредвиденные расходы", amount: 234000, color: "#9333EA" },
  { category: "Прочие расходы", amount: 234000, color: "#9CA3AF" },
];

export const budgetOperations: BudgetOperation[] = [
  {
    id: "op-1",
    date: "2026-07-28",
    objectName: "ЖК «Сомони»",
    action: "Добавлены расходы",
    amount: -98500,
    responsible: "Фируз Рахмонов",
  },
  {
    id: "op-2",
    date: "2026-07-27",
    objectName: "Бизнес-центр «Ватан»",
    action: "Утверждён бюджет",
    amount: null,
    responsible: "Комрон Саидов",
  },
  {
    id: "op-3",
    date: "2026-07-26",
    objectName: "Коттедж «Навруз»",
    action: "Обновлён бюджет",
    amount: null,
    responsible: "Шариф Давлатов",
  },
  {
    id: "op-4",
    date: "2026-07-25",
    objectName: "Складской комплекс «Логистика»",
    action: "Добавлены расходы",
    amount: -85000,
    responsible: "Мухиддин Холов",
  },
  {
    id: "op-5",
    date: "2026-07-25",
    objectName: "Медицинская клиника «Шифо»",
    action: "Создан бюджет",
    amount: null,
    responsible: "Бахтиёр Курбонов",
  },
];

export const budgetRiskItems: RiskItem[] = [
  {
    id: "budget-risk-1",
    title: "Бизнес-центр «Ватан»",
    description: "Превышение на 45 000 сомони",
    badgeLabel: "Превышение",
    severity: "red",
    icon: "trend",
  },
  {
    id: "budget-risk-2",
    title: "Школа №15",
    description: "Превышение на 15 000 сомони",
    badgeLabel: "Превышение",
    severity: "red",
    icon: "trend",
  },
  {
    id: "budget-risk-3",
    title: "Складской комплекс «Логистика»",
    description: "Ожидает подтверждения расходов на 85 000 сомони",
    badgeLabel: "Ожидает проверки",
    severity: "orange",
    icon: "clock",
  },
  {
    id: "budget-risk-4",
    title: "Медицинская клиника «Шифо»",
    description: "Бюджет в черновике",
    badgeLabel: "Черновик",
    severity: "blue",
    icon: "file",
  },
];
