import { UserRoundX } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";

/**
 * GET /api/v1/timesheets does scope correctly to a Brigadir's own brigade
 * server-side (ListTimesheetsQueryHandler), and POST /timesheets/check-in +
 * /{id}/check-out are the real Brigadir-only attendance actions — but every
 * one of those returns only a bare `workerId`, and there is no endpoint a
 * Brigadir can call to resolve worker names for their own crew (see
 * BrigadirTeamPage). Without names this page can neither show whose
 * attendance a record belongs to nor offer a worker picker for check-in, so
 * rather than list anonymous IDs it is left unavailable until that gap is
 * closed. See the frontend audit (2026-07-31) and its remediation report for
 * the exact missing contract.
 */
export default function BrigadirAttendancePage() {
  return (
    <AppLayout title="Посещаемость" subtitle="Раздел пока недоступен">
      <Card>
        <EmptyState
          icon={UserRoundX}
          title="Раздел пока недоступен"
          description="Backend ещё не даёт бригадиру получить имена сотрудников своей бригады, поэтому отметки посещаемости нельзя показать корректно. Раздел появится, когда будет добавлен соответствующий API."
        />
      </Card>
    </AppLayout>
  );
}
