import type { AssignmentStatus, BudgetLineStatus, EstimateStatus } from "../types";

type Tone = "red" | "orange" | "blue" | "green" | "purple";

export const ASSIGNMENT_STATUS_CONFIG: Record<AssignmentStatus, { label: string; tone: Tone }> = {
  active: { label: "В работе", tone: "orange" },
  completed: { label: "Завершено", tone: "green" },
  cancelled: { label: "Отменено", tone: "red" },
  overdue: { label: "Просрочено", tone: "red" },
};

export const ESTIMATE_STATUS_CONFIG: Record<EstimateStatus, { label: string; tone: Tone }> = {
  draft: { label: "Черновик", tone: "blue" },
  pending_review: { label: "На рассмотрении", tone: "orange" },
  approved: { label: "Утверждена", tone: "green" },
};

export const BUDGET_STATUS_CONFIG: Record<BudgetLineStatus, { label: string; tone: Tone }> = {
  in_progress: { label: "В работе", tone: "green" },
  over_budget: { label: "Превышение", tone: "red" },
  completed: { label: "Завершён", tone: "blue" },
  pending_approval: { label: "На согласовании", tone: "orange" },
  draft: { label: "Черновик", tone: "blue" },
};

export function getBudgetProgressTone(status: BudgetLineStatus, usagePercent: number): "green" | "orange" | "red" {
  if (status === "over_budget") {
    return usagePercent > 100 ? "red" : "orange";
  }
  if (status === "pending_approval" || status === "draft") {
    return "orange";
  }
  return "green";
}
