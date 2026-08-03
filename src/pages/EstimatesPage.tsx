import { Calculator } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/Button";

/**
 * Backend only exposes EstimateItem per-object (POST/GET
 * /objects/{objectId}/estimate-items) — there's no company-wide "all
 * estimates" endpoint to back a standalone list here. The actual estimate
 * table lives in the object's own view (ObjectsPage → ObjectEstimateItems),
 * so this page just routes people there instead of inventing a company-wide
 * aggregate the backend doesn't have.
 */
export default function EstimatesPage() {
  const navigate = useNavigate();

  return (
    <AppLayout title="Сметы" subtitle="Смета ведётся в разрезе объекта">
      <Card>
        <EmptyState
          icon={Calculator}
          title="Выберите объект, чтобы увидеть его смету"
          description="Общего списка смет по всем объектам нет — откройте объект и посмотрите его смету там."
          action={<Button onClick={() => navigate("/objects")}>К списку объектов</Button>}
        />
      </Card>
    </AppLayout>
  );
}
