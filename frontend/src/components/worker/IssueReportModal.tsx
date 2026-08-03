import { useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ApiError, NetworkError } from '../../api/apiClient';
import { createIssueReport, type IssueReport } from '../../api/issueReportsApi';

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return 'Не удалось подключиться к серверу';
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Сессия истекла. Войдите в систему заново.';
    return error.message || fallback;
  }
  return fallback;
}

const INITIAL_FORM = { title: '', description: '' };

interface IssueReportModalProps {
  open: boolean;
  objectId: string;
  individualTaskId?: string;
  onClose: () => void;
  onSuccess: (created: IssueReport) => void;
}

// "Сообщить о проблеме" — new minimal entity (Worker-dashboard checkpoint,
// docs/PROGRESS.md), POST /api/v1/issue-reports, optional single photo.
export function IssueReportModal({ open, objectId, individualTaskId, onClose, onSuccess }: IssueReportModalProps) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleClose() {
    setForm(INITIAL_FORM);
    setPhoto(null);
    setError('');
    onClose();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (!objectId) {
      setError('Нет доступного объекта');
      return;
    }
    if (!form.title.trim() || !form.description.trim()) {
      setError('Заполните заголовок и описание проблемы');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const created = await createIssueReport({
        objectId,
        title: form.title.trim(),
        description: form.description.trim(),
        individualTaskId,
        photo: photo ?? undefined,
      });
      onSuccess(created);
      handleClose();
    } catch (err) {
      setError(describeError(err, 'Не удалось отправить сообщение о проблеме'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Сообщить о проблеме" size="sm">
      <form className="users-modal-form" onSubmit={(e) => void submit(e)}>
        <label><span>Заголовок</span><input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} autoFocus /></label>
        <label><span>Описание</span><input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></label>
        <label><span>Фото</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></label>
        {error && <p className="users-modal-error" role="alert">{error}</p>}
        <div className="users-modal-actions">
          <Button type="button" variant="secondary" onClick={handleClose}>Отмена</Button>
          <Button type="submit" disabled={submitting}>{submitting ? 'Отправка...' : 'Отправить'}</Button>
        </div>
      </form>
    </Modal>
  );
}
