import { useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ApiError, NetworkError } from '../../api/apiClient';
import { createMaterialRequest, type MaterialRequest } from '../../api/materialRequestsApi';
import '../../styles/users.css';

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return 'Не удалось подключиться к серверу';
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Сессия истекла. Войдите в систему заново.';
    return error.message || fallback;
  }
  return fallback;
}

const INITIAL_FORM = { materialName: '', unit: '', qty: '' };

interface MaterialRequestModalProps {
  open: boolean;
  objectId: string;
  onClose: () => void;
  onSuccess: (created: MaterialRequest) => void;
}

// Shared by WorkerMaterialsPage and the dashboard's "Запросить материал"
// quick action — one implementation of the POST /material-requests form.
export function MaterialRequestModal({ open, objectId, onClose, onSuccess }: MaterialRequestModalProps) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleClose() {
    setForm(INITIAL_FORM);
    setError('');
    onClose();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    const qty = Number(form.qty);
    if (!objectId) {
      setError('Нет доступного объекта');
      return;
    }
    if (!form.materialName.trim() || !form.unit.trim() || !form.qty || qty <= 0) {
      setError('Заполните материал, единицу измерения и количество больше нуля');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const created = await createMaterialRequest({
        objectId,
        materialName: form.materialName.trim(),
        unit: form.unit.trim(),
        qty,
      });
      onSuccess(created);
      handleClose();
    } catch (err) {
      setError(describeError(err, 'Не удалось отправить заявку'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Новая заявка на материал" size="sm">
      <form className="users-modal-form" onSubmit={(e) => void submit(e)}>
        <label><span>Материал</span><input value={form.materialName} onChange={(e) => setForm((f) => ({ ...f, materialName: e.target.value }))} autoFocus /></label>
        <label><span>Единица измерения</span><input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="кг, шт, м3..." /></label>
        <label><span>Количество</span><input type="number" min="0" step="0.01" value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))} /></label>
        {error && <p className="users-modal-error" role="alert">{error}</p>}
        <div className="users-modal-actions">
          <Button type="button" variant="secondary" onClick={handleClose}>Отмена</Button>
          <Button type="submit" disabled={submitting}>{submitting ? 'Отправка...' : 'Отправить'}</Button>
        </div>
      </form>
    </Modal>
  );
}
