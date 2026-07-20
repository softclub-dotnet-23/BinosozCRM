import type { PayrollRole, PayrollStatus } from "../types";

/**
 * There's no real authentication/session system in this app yet (the header's
 * "Садди Имомов / Владелец" is static decoration). Payroll's approval chain still
 * needs a role concept to enforce and demo, so PayrollPage exposes a small,
 * persisted "current role" switcher and every action is gated through these
 * functions — centralized so they map cleanly onto real backend authorization
 * once accounts/roles exist.
 */
export const PAYROLL_TRANSITIONS: Record<PayrollStatus, PayrollStatus[]> = {
  prepared: ["pending_approval", "needs_review", "cancelled"],
  needs_review: ["prepared"],
  pending_approval: ["approved", "returned"],
  approved: ["paid"],
  returned: ["prepared", "cancelled"],
  paid: [],
  cancelled: [],
};

export function canTransition(from: PayrollStatus, to: PayrollStatus): boolean {
  return PAYROLL_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canGeneratePayroll(role: PayrollRole): boolean {
  return role === "accountant" || role === "owner";
}

export function canEditPayroll(role: PayrollRole, status: PayrollStatus): boolean {
  return role === "accountant" && (status === "prepared" || status === "returned" || status === "needs_review");
}

export function canSubmitForApproval(role: PayrollRole, status: PayrollStatus): boolean {
  return role === "accountant" && (status === "prepared" || status === "needs_review");
}

export function canFlagForReview(role: PayrollRole, status: PayrollStatus): boolean {
  return role === "accountant" && status === "prepared";
}

export function canResolveReview(role: PayrollRole, status: PayrollStatus): boolean {
  return role === "accountant" && status === "needs_review";
}

export function canApprovePayroll(role: PayrollRole, status: PayrollStatus): boolean {
  return role === "owner" && status === "pending_approval";
}

export function canReturnPayroll(role: PayrollRole, status: PayrollStatus): boolean {
  return role === "owner" && status === "pending_approval";
}

export function canMarkAsPaid(role: PayrollRole, status: PayrollStatus): boolean {
  return (role === "accountant" || role === "owner") && status === "approved";
}

export function canCancelPayroll(role: PayrollRole, status: PayrollStatus): boolean {
  return role === "accountant" && (status === "prepared" || status === "returned");
}

export function canViewFullPayroll(role: PayrollRole): boolean {
  return role === "accountant" || role === "owner";
}

export const PAYROLL_ROLE_LABEL: Record<PayrollRole, string> = {
  accountant: "Бухгалтер",
  owner: "Владелец",
  prorab: "Прораб",
};

export const PAYROLL_ROLES: PayrollRole[] = ["accountant", "owner", "prorab"];
