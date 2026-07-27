import type { AssignmentStatus, BudgetLineStatus, EstimateStatus } from "../types";
import type { AppStrings } from "../lib/i18n/appStrings";

type Tone = "red" | "orange" | "blue" | "green" | "purple";

export const ASSIGNMENT_STATUS_CONFIG: Record<AssignmentStatus, { tone: Tone }> = {
  active: { tone: "orange" },
  completed: { tone: "green" },
  cancelled: { tone: "red" },
  overdue: { tone: "red" },
};

export function assignmentStatusLabel(s: AppStrings["brigades"], status: AssignmentStatus): string {
  const map: Record<AssignmentStatus, string> = {
    active: s.assignmentStatusActive,
    completed: s.assignmentStatusCompleted,
    cancelled: s.assignmentStatusCancelled,
    overdue: s.assignmentStatusOverdue,
  };
  return map[status];
}

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
