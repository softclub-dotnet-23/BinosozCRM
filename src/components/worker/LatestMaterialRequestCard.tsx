import { Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Badge } from '../ui/StatusBadge';
import { EmptyState } from '../ui/EmptyState';
import type { MaterialRequest, MaterialRequestStatus } from '../../api/materialRequestsApi';

const STATUS_LABEL: Record<MaterialRequestStatus, string> = {
  Requested: 'Запрошено',
  Approved: 'Одобрено',
  Ordered: 'Заказано',
  PartiallyDelivered: 'Доставлено частично',
  Delivered: 'Доставлено',
  Rejected: 'Отклонено',
};
const STATUS_TONE: Record<MaterialRequestStatus, 'blue' | 'orange' | 'green' | 'red' | 'purple'> = {
  Requested: 'blue',
  Approved: 'purple',
  Ordered: 'orange',
  PartiallyDelivered: 'orange',
  Delivered: 'green',
  Rejected: 'red',
};

interface LatestMaterialRequestCardProps {
  request: MaterialRequest | null;
}

// No request "code" exists in the domain (only a Guid Id, no sequence) — the
// material name + date is the identifying line instead of a fabricated
// "#MR-024"-style number.
export function LatestMaterialRequestCard({ request }: LatestMaterialRequestCardProps) {
  const navigate = useNavigate();

  return (
    <button type="button" className="w-full text-left" onClick={() => navigate('/inventory/materials')}>
      <Card className="p-4 transition-shadow hover:shadow-(--shadow-card-hover)">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">Последняя заявка на материал</p>
          <Package size={16} className="text-ink-muted" />
        </div>
        {request ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-ink">{request.materialName}</p>
              <p className="text-xs text-ink-muted">
                {request.qty} {request.unit} · {new Date(request.requestedAt).toLocaleDateString('ru-RU')}
              </p>
            </div>
            <Badge tone={STATUS_TONE[request.status]}>{STATUS_LABEL[request.status]}</Badge>
          </div>
        ) : (
          <div className="mt-2">
            <EmptyState icon={Package} title="Заявок на материалы пока нет" />
          </div>
        )}
      </Card>
    </button>
  );
}
