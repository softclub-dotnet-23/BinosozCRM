import { ArrowLeftRight } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";

/**
 * No backend entity or endpoint backs an inter-warehouse material transfer
 * (no TransfersController, no transfer fields in the API contracts audited
 * 2026-07-31). Rather than invent one, this section is left unavailable. See
 * the frontend audit and its remediation report for what a real contract
 * here would need.
 */
export default function TransfersPage() {
  return (
    <AppLayout title="Перемещения" subtitle="Раздел пока недоступен">
      <Card>
        <EmptyState
          icon={ArrowLeftRight}
          title="Раздел пока недоступен"
          description="Для перемещений материалов между складами пока нет соответствующей модели данных на backend. Раздел будет включён после того, как появится согласованный бизнес-контракт для этой сущности."
        />
      </Card>
    </AppLayout>
  );
}
