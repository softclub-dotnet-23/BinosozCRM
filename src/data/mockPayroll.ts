import { mockStaff } from "./mockStaff";
import { mockAttendance } from "./mockAttendance";
import { calculatePayrollRecord } from "../utils/payrollAnalytics";
import type { PayrollRecord, PayrollStatus, PayrollStatusHistoryEntry } from "../types";

const PERIOD_START = "2026-07-01";
const PERIOD_END = "2026-07-31";
const PERIOD_LABEL = "Июль 2026";
const PREPARED_BY = "Каримов Сухроб";
const OWNER = "Садди Имомов";

// Roughly matches the distribution shown in the reference "Статусы выплат" donut
// (paid ~39%, pending approval ~26%, prepared ~24%, needs review ~11%), with a
// handful of "approved" records left over to populate upcoming payments.
const STATUS_CYCLE: PayrollStatus[] = [
  "paid",
  "paid",
  "paid",
  "paid",
  "pending_approval",
  "pending_approval",
  "prepared",
  "prepared",
  "needs_review",
  "approved",
];

function withHistory(record: PayrollRecord, entries: Omit<PayrollStatusHistoryEntry, "id">[]): PayrollStatusHistoryEntry[] {
  return [...record.statusHistory, ...entries.map((e, i) => ({ ...e, id: `${record.id}-h${i + 1}` }))];
}

function applyStatus(record: PayrollRecord, status: PayrollStatus, index: number): PayrollRecord {
  const submittedAt = `${PERIOD_END}T10:00:00`;
  if (status === "prepared") return record;

  if (status === "needs_review") {
    return {
      ...record,
      status,
      statusHistory: withHistory(record, [
        { status: "needs_review", date: submittedAt, actor: PREPARED_BY, comment: "Нужно сверить посещаемость перед отправкой" },
      ]),
    };
  }

  if (status === "pending_approval") {
    return {
      ...record,
      status,
      submittedAt,
      statusHistory: withHistory(record, [{ status: "pending_approval", date: submittedAt, actor: PREPARED_BY, comment: "" }]),
    };
  }

  const approvedAt = `2026-07-30T15:00:00`;
  if (status === "approved") {
    const paymentDate = `2026-08-0${1 + (index % 3)}`;
    return {
      ...record,
      status,
      submittedAt,
      approvedBy: OWNER,
      approvedAt,
      paymentDate,
      statusHistory: withHistory(record, [
        { status: "pending_approval", date: submittedAt, actor: PREPARED_BY, comment: "" },
        { status: "approved", date: approvedAt, actor: OWNER, comment: "" },
      ]),
    };
  }

  const paidAt = `2026-07-31T12:00:00`;
  return {
    ...record,
    status: "paid",
    submittedAt,
    approvedBy: OWNER,
    approvedAt,
    paymentDate: PERIOD_END,
    paymentMethod: "Банковский перевод",
    paymentReference: `PAY-2026-07-${String(index + 1).padStart(3, "0")}`,
    paidAt,
    statusHistory: withHistory(record, [
      { status: "pending_approval", date: submittedAt, actor: PREPARED_BY, comment: "" },
      { status: "approved", date: approvedAt, actor: OWNER, comment: "" },
      { status: "paid", date: paidAt, actor: PREPARED_BY, comment: "" },
    ]),
  };
}

const activeStaff = mockStaff.filter((s) => s.status === "active");

const PREPARED_AT = `${PERIOD_END}T09:00:00`;

export const mockPayroll: PayrollRecord[] = activeStaff.map((staff, i) => {
  const base = calculatePayrollRecord({
    staff,
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    periodLabel: PERIOD_LABEL,
    attendance: mockAttendance,
    options: {},
    preparedBy: PREPARED_BY,
    number: i + 1,
  });
  const id = `pay-${String(i + 1).padStart(4, "0")}`;
  const seeded: PayrollRecord = {
    ...base,
    id,
    preparedAt: PREPARED_AT,
    createdAt: PREPARED_AT,
    updatedAt: PREPARED_AT,
    statusHistory: [{ id: `${id}-h0`, status: base.status, date: PREPARED_AT, actor: PREPARED_BY, comment: base.statusHistory[0].comment }],
  };
  // A record already flagged for missing attendance stays "needs_review" — the demo status
  // cycle (paid/pending/prepared/...) never overrides that real, explicit flag.
  if (base.attendanceDataMissing) return seeded;
  return applyStatus(seeded, STATUS_CYCLE[i % STATUS_CYCLE.length], i);
});
