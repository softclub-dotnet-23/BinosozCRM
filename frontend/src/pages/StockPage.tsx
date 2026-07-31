import { Boxes } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";

/**
 * No backend entity or endpoint backs warehouse stock levels, reservations,
 * or adjustments (no StockController, no such fields in the API contracts
 * audited 2026-07-31). Rather than invent one, this section is left
 * unavailable. See the frontend audit and its remediation report for what a
 * real contract here would need.
 */
export default function StockPage() {
  return (
    <AppLayout title="Остатки" subtitle="Раздел пока недоступен">
      <Card>
        <EmptyState
          icon={Boxes}
          title="Раздел пока недоступен"
          description="Для остатков материалов на складах пока нет соответствующей модели данных на backend. Раздел будет включён после того, как появится согласованный бизнес-контракт для этой сущности."
        />
      </Card>
    </AppLayout>
  );
}
