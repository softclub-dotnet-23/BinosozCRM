import type { PayrollRole, UserRole, PayrollStatus } from "../types";

/**
 * Payroll's approval chain is gated through these functions using the real
 * logged-in user's role (see AuthContext / toPayrollRole below) — centralized
 * so the same rules stay in one place regardless of where the session role
 * comes from.
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

/**
 * PayrollRole only distinguishes the three roles Payroll actually branches
 * on. An administrator account carries the same authority as the owner here;
 * brigadir/storekeeper never reach this page (see roleAccess.ts) but fall
 * back to the least-privileged option rather than something that would type-error.
 */
export function toPayrollRole(role: UserRole): PayrollRole {
  if (role === "owner" || role === "administrator") return "owner";
  if (role === "accountant") return "accountant";
  return "prorab";
}
