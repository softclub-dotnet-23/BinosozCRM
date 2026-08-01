import { Calculator } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";

/**
 * No backend entity matches this page's "Estimate" concept (its own id,
 * status workflow, and total amount across a whole object). The closest real
 * concept is EstimateItem — POST/GET /api/v1/objects/{objectId}/estimate-items
 * — but that's a per-object line item (WorkType/Unit/PlannedQty/
 * PlannedUnitPrice/Stage), a different shape and workflow, the same class of
 * mismatch the project already decided not to paper over for Assignments
 * (see AssignmentsPage.tsx). Collapsing the two without a confirmed business
 * contract would misrepresent the numbers, so this section is left
 * unavailable rather than reusing EstimateItem under a different name. See
 * the frontend audit (2026-07-31) and its remediation report.
 */
export default function EstimatesPage() {
  return (
    <AppLayout title="Сметы" subtitle="Раздел пока недоступен">
      <Card>
        <EmptyState
          icon={Calculator}
          title="Раздел пока недоступен"
          description="Для смет в текущем виде нет соответствующей модели данных на backend. Раздел будет включён после того, как появится согласованный бизнес-контракт для этой сущности."
        />
      </Card>
    </AppLayout>
  );
}
