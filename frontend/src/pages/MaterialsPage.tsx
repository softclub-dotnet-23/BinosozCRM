import { Package } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";

/**
 * No backend entity or endpoint backs a material catalog / stock master
 * record (no MaterialsController; MaterialRequestsController,
 * MaterialDeliveriesController, and MaterialConsumptionReportsController
 * cover requests/deliveries/consumption as their own real, separate entities
 * — see MaterialRequestsPage.tsx, ReceiptsPage.tsx, WriteOffsPage.tsx, which
 * are already wired to those). Rather than invent a materials-catalog
 * endpoint, this section is left unavailable. See the frontend audit
 * (2026-07-31) and its remediation report.
 */
export default function MaterialsPage() {
  return (
    <AppLayout title="Материалы" subtitle="Раздел пока недоступен">
      <Card>
        <EmptyState
          icon={Package}
          title="Раздел пока недоступен"
          description="Для справочника материалов и остатков пока нет соответствующей модели данных на backend. Раздел будет включён после того, как появится согласованный бизнес-контракт для этой сущности."
        />
      </Card>
    </AppLayout>
  );
}
