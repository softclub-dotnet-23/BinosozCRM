import { ClipboardX } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";

/**
 * No backend entity backs "assignments" (brigade+object+period+amount) — the
 * closest real concept, WorkOrder, is priced per-unit (PlannedQty×UnitPrice),
 * not a lump sum, and collapsing the two without a confirmed business
 * contract risked misrepresenting a money figure. User decision
 * (2026-07-31): leave this section unavailable rather than reuse WorkOrder
 * under a different name. See the final integration report for the backend
 * model this would need if built for real.
 */
export default function AssignmentsPage() {
  return (
    <AppLayout title="Назначения" subtitle="Раздел пока недоступен">
      <Card>
        <EmptyState
          icon={ClipboardX}
          title="Раздел пока недоступен"
          description="Для назначений бригад с фиксированной суммой и сроком пока нет соответствующей модели данных на backend. Раздел будет включён после того, как появится согласованный бизнес-контракт для этой сущности."
        />
      </Card>
    </AppLayout>
  );
}
