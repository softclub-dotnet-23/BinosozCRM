/** Application/Common/Models/PagedResult.cs — camelCase on the wire (ASP.NET Core's default
 * System.Text.Json naming policy for AddControllers(), confirmed: no custom JsonOptions anywhere
 * in the backend). */
export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

/** Domain/Enums/Role.cs — the only 4 roles the backend actually issues. AuthTokensDto.Role is
 * the one place this comes across as a string (manually .ToString()'d, see the note below);
 * everywhere else (e.g. UserDto.Role) it's the numeric Role enum, same as every other DTO enum. */
export type BackendRole = "Owner" | "Prorab" | "Brigadir" | "Accountant";

export const Role = { Owner: 0, Prorab: 1, Brigadir: 2, Accountant: 3 } as const;
export type Role = (typeof Role)[keyof typeof Role];

/**
 * None of the backend's DTO enum fields (IndividualTaskStatus, WorkOrderStatus,
 * MaterialRequestStatus, PayrollEntryStatus, AbsenceType, ...) go through a
 * JsonStringEnumConverter — there isn't one configured anywhere in Program.cs or the DI setup.
 * System.Text.Json's default enum behavior is a plain integer matching the C# enum's declaration
 * order. The two verified exceptions are AuthTokensDto.Role and DashboardWorkStatusDto's
 * StatusCountDto.Status, which the backend handlers manually .ToString() before building the DTO.
 *
 * These numeric maps mirror backend/Domain/Enums/*.cs exactly — keep them in sync if those
 * files change. Do NOT treat these fields as string unions on the wire.
 */
export const IndividualTaskStatus = { Assigned: 0, InProgress: 1, Done: 2 } as const;
export type IndividualTaskStatus = (typeof IndividualTaskStatus)[keyof typeof IndividualTaskStatus];

export const WorkOrderStatus = {
  New: 0,
  Assigned: 1,
  InProgress: 2,
  OnReview: 3,
  Accepted: 4,
  Rejected: 5,
  Closed: 6,
} as const;
export type WorkOrderStatus = (typeof WorkOrderStatus)[keyof typeof WorkOrderStatus];

export const MaterialRequestStatus = {
  Requested: 0,
  Approved: 1,
  Ordered: 2,
  PartiallyDelivered: 3,
  Delivered: 4,
  Rejected: 5,
} as const;
export type MaterialRequestStatus = (typeof MaterialRequestStatus)[keyof typeof MaterialRequestStatus];

export const PayrollEntryStatus = { Draft: 0, Approved: 1, Paid: 2 } as const;
export type PayrollEntryStatus = (typeof PayrollEntryStatus)[keyof typeof PayrollEntryStatus];

export const AbsenceType = { SickLeave: 0, Vacation: 1, Unpaid: 2, Other: 3 } as const;
export type AbsenceType = (typeof AbsenceType)[keyof typeof AbsenceType];

export const ConstructionObjectStatus = { Planned: 0, InProgress: 1, Suspended: 2, Completed: 3, Closed: 4 } as const;
export type ConstructionObjectStatus = (typeof ConstructionObjectStatus)[keyof typeof ConstructionObjectStatus];

export const PayRateType = { Hourly: 0, Piecework: 1 } as const;
export type PayRateType = (typeof PayRateType)[keyof typeof PayRateType];

/** Labels for the UI — string enums would have made these unnecessary, but the wire format is
 * numeric, so every place that renders a status needs to go through one of these maps. */
export const INDIVIDUAL_TASK_STATUS_LABEL: Record<IndividualTaskStatus, string> = {
  [IndividualTaskStatus.Assigned]: "Назначена",
  [IndividualTaskStatus.InProgress]: "В работе",
  [IndividualTaskStatus.Done]: "Выполнена",
};

export const MATERIAL_REQUEST_STATUS_LABEL: Record<MaterialRequestStatus, string> = {
  [MaterialRequestStatus.Requested]: "Запрошено",
  [MaterialRequestStatus.Approved]: "Одобрено",
  [MaterialRequestStatus.Ordered]: "Заказано",
  [MaterialRequestStatus.PartiallyDelivered]: "Частично доставлено",
  [MaterialRequestStatus.Delivered]: "Доставлено",
  [MaterialRequestStatus.Rejected]: "Отклонено",
};

export const PAYROLL_ENTRY_STATUS_LABEL: Record<PayrollEntryStatus, string> = {
  [PayrollEntryStatus.Draft]: "Черновик",
  [PayrollEntryStatus.Approved]: "Утверждено",
  [PayrollEntryStatus.Paid]: "Выплачено",
};

export const ABSENCE_TYPE_LABEL: Record<AbsenceType, string> = {
  [AbsenceType.SickLeave]: "Больничный",
  [AbsenceType.Vacation]: "Отпуск",
  [AbsenceType.Unpaid]: "Без содержания",
  [AbsenceType.Other]: "Другое",
};

export const CONSTRUCTION_OBJECT_STATUS_LABEL: Record<ConstructionObjectStatus, string> = {
  [ConstructionObjectStatus.Planned]: "Планируется",
  [ConstructionObjectStatus.InProgress]: "В работе",
  [ConstructionObjectStatus.Suspended]: "Приостановлен",
  [ConstructionObjectStatus.Completed]: "Завершён",
  [ConstructionObjectStatus.Closed]: "Закрыт",
};

export const PAY_RATE_TYPE_LABEL: Record<PayRateType, string> = {
  [PayRateType.Hourly]: "Почасовая",
  [PayRateType.Piecework]: "Сдельная",
};
