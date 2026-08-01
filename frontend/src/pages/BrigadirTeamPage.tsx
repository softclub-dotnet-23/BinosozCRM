import { Users } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";

/**
 * No backend endpoint lets a Brigadir read their own crew: GET
 * /api/v1/brigades/{id}/workers is Owner/Prorab-only (WorkersController.cs's
 * own comment: "Brigadir's read access to own-brigade workers isn't wired
 * here"), and there is no endpoint at all for a Brigadir to resolve their own
 * brigade's identity (GET /api/v1/brigades is likewise Owner/Prorab-only; the
 * session/`/auth/me` response carries no brigade link). Rather than invent
 * either endpoint, this section is left unavailable — see the frontend audit
 * (2026-07-31) and its remediation report for the exact missing contracts.
 */
export default function BrigadirTeamPage() {
  return (
    <AppLayout title="Моя бригада" subtitle="Раздел пока недоступен">
      <Card>
        <EmptyState
          icon={Users}
          title="Раздел пока недоступен"
          description="Backend ещё не даёт бригадиру получить состав своей бригады. Раздел появится, когда будет добавлен соответствующий API."
        />
      </Card>
    </AppLayout>
  );
}
