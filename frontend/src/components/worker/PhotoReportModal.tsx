import { useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ApiError, NetworkError } from '../../api/apiClient';
import { addWorkOrderProgress, type WorkOrder, type WorkOrderProgress } from '../../api/workOrdersApi';
import '../../styles/users.css';

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return 'Не удалось подключиться к серверу';
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Сессия истекла. Войдите в систему заново.';
    return error.message || fallback;
  }
  return fallback;
}

interface PhotoReportModalProps {
  workOrder: WorkOrder | null;
  onClose: () => void;
  onSuccess: (created: WorkOrderProgress) => void;
}

// Shared by WorkerPhotoReportsPage and the dashboard's "Фотоотчёт" quick
// action — one implementation of the POST /work-orders/{id}/progress form,
// not duplicated per caller.
export function PhotoReportModal({ workOrder, onClose, onSuccess }: PhotoReportModalProps) {
  const [qty, setQty] = useState('');
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleClose() {
    setQty('');
    setComment('');
    setPhotos([]);
    setFormError('');
    onClose();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!workOrder || submitting) return;
    const reportedQty = Number(qty);
    if (!qty || reportedQty <= 0) {
      setFormError('Укажите выполненный объём больше нуля');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const created = await addWorkOrderProgress(workOrder.id, {
        reportedQty,
        comment: comment.trim() || undefined,
        photos,
      });
      onSuccess(created);
      handleClose();
    } catch (error) {
      setFormError(describeError(error, 'Не удалось отправить фотоотчёт'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={workOrder !== null} onClose={handleClose} title="Отчитаться о прогрессе" description={workOrder?.code} size="sm">
      <form className="users-modal-form" onSubmit={(e) => void submit(e)}>
        <label><span>Выполненный объём</span><input type="number" min="0" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus /></label>
        <label><span>Комментарий</span><input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Необязательно" /></label>
        <label><span>Фото</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setPhotos(Array.from(e.target.files ?? []))} /></label>
        {formError && <p className="users-modal-error" role="alert">{formError}</p>}
        <div className="users-modal-actions">
          <Button type="button" variant="secondary" onClick={handleClose}>Отмена</Button>
          <Button type="submit" disabled={submitting}>{submitting ? 'Отправка...' : 'Отправить'}</Button>
        </div>
      </form>
    </Modal>
  );
}
