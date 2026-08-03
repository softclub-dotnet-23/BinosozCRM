import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, HardHat, LogIn, LogOut, MapPin } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { CustomSelect } from '../ui/CustomSelect';
import { ApiError, NetworkError } from '../../api/apiClient';
import { checkIn, checkOut, type Timesheet } from '../../api/timesheetsApi';
import type { LookupItem } from '../../api/lookupsApi';
import type { Brigade } from '../../api/brigadesApi';
import { formatDushanbeTime } from '../../utils/dushanbeTime';
import { useElapsedLabel } from './useElapsedTime';
import '../../styles/users.css';

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return 'Не удалось подключиться к серверу';
  if (error instanceof ApiError) {
    if (error.code === 'TIMESHEET_ABSENCE_CONFLICT') return 'На эту дату у вас оформлено отсутствие.';
    if (error.code === 'TIMESHEET_ALREADY_CHECKED_IN') return 'Вы уже отмечены сегодня.';
    return error.message || fallback;
  }
  return fallback;
}

interface ShiftStatusCardProps {
  ownWorkerId: string;
  brigade: Brigade | null;
  todayTimesheet: Timesheet | null;
  objects: LookupItem[];
  objectNameById: Map<string, string>;
  hasActiveTask: boolean;
  onCheckedIn: (t: Timesheet) => void;
  onCheckedOut: (t: Timesheet) => void;
}

// Real fields only: Brigade.name/brigadirFullName (GET /brigades/mine),
// Timesheet.checkInAt/plannedStartTime/objectId (GET /timesheets), object
// name via listObjectLookups. No fabricated shift-length denominator —
// Worker.ShiftEndTime doesn't exist in the domain (MASTER §15 open question
// #6 keeps overtime/shift norms out of MVP), so elapsed time is shown as a
// plain duration, not a percentage against an invented total.
export function ShiftStatusCard({
  ownWorkerId,
  brigade,
  todayTimesheet,
  objects,
  objectNameById,
  hasActiveTask,
  onCheckedIn,
  onCheckedOut,
}: ShiftStatusCardProps) {
  const navigate = useNavigate();
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInObjectId, setCheckInObjectId] = useState('');
  const [checkInError, setCheckInError] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const elapsed = useElapsedLabel(todayTimesheet?.checkInAt ?? null, todayTimesheet?.checkOutAt ?? null);
  const objectName = todayTimesheet ? (objectNameById.get(todayTimesheet.objectId) ?? null) : null;

  function openCheckIn() {
    setCheckInObjectId(objects[0]?.id ?? '');
    setCheckInError('');
    setCheckInOpen(true);
  }

  async function submitCheckIn(event: FormEvent) {
    event.preventDefault();
    if (checkingIn) return;
    if (!checkInObjectId) {
      setCheckInError('Выберите объект');
      return;
    }
    setCheckingIn(true);
    setCheckInError('');
    try {
      const created = await checkIn(ownWorkerId, checkInObjectId);
      onCheckedIn(created);
      setCheckInOpen(false);
    } catch (error) {
      setCheckInError(describeError(error, 'Не удалось отметить приход'));
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleCheckOut() {
    if (!todayTimesheet || checkingOut) return;
    setCheckingOut(true);
    try {
      const updated = await checkOut(todayTimesheet.id);
      onCheckedOut(updated);
    } finally {
      setCheckingOut(false);
    }
  }

  if (objects.length === 0) {
    return (
      <Card className="relative overflow-hidden p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Рабочая смена</p>
        <p className="mt-2 text-lg font-bold text-ink">Смена на сегодня не назначена</p>
        <p className="mt-1 text-sm text-ink-secondary">Нет доступного объекта для вашей бригады.</p>
      </Card>
    );
  }

  const isActive = !!todayTimesheet?.checkInAt && !todayTimesheet.checkOutAt;
  const isCompleted = !!todayTimesheet?.checkOutAt;

  return (
    <Card className="relative overflow-hidden p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-[0.06]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, currentColor 0 1px, transparent 1px 24px), repeating-linear-gradient(90deg, currentColor 0 1px, transparent 1px 24px)',
          color: 'var(--color-ink)',
        }}
      />
      <div className="relative">
        <p className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Рабочая смена</p>

        {!todayTimesheet && (
          <>
            <p className="mt-2 text-lg font-bold text-ink">Смена ещё не начата</p>
            <p className="mt-1 text-sm text-ink-secondary">Отметьте приход, когда будете готовы начать работу.</p>
          </>
        )}

        {todayTimesheet && (
          <>
            <p className="mt-2 text-lg font-bold text-ink">{objectName ?? 'Объект'}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-secondary">
              {brigade && (
                <span className="inline-flex items-center gap-1.5">
                  <HardHat size={14} /> Бригада «{brigade.name}»{brigade.brigadirFullName ? ` · Бригадир: ${brigade.brigadirFullName}` : ''}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {objectName ?? '—'}</span>
            </div>

            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className={isActive ? 'inline-block h-2 w-2 rounded-full bg-green' : 'inline-block h-2 w-2 rounded-full bg-ink-muted'} />
              {isActive && todayTimesheet.checkInAt && <span className="text-ink-secondary">Смена началась в {formatDushanbeTime(todayTimesheet.checkInAt)}{elapsed ? ` · ${elapsed}` : ''}</span>}
              {isCompleted && todayTimesheet.checkInAt && todayTimesheet.checkOutAt && (
                <span className="text-ink-secondary">
                  Смена завершена · {formatDushanbeTime(todayTimesheet.checkInAt)}–{formatDushanbeTime(todayTimesheet.checkOutAt)}{elapsed ? ` (${elapsed})` : ''}
                </span>
              )}
              {todayTimesheet.lateMinutes ? <span className="text-orange-600">Опоздание {todayTimesheet.lateMinutes} мин</span> : null}
            </div>
          </>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          {!todayTimesheet && <Button onClick={openCheckIn}><LogIn size={15} /> Начать смену</Button>}
          {isActive && <Button variant="secondary" disabled={checkingOut} onClick={() => void handleCheckOut()}><LogOut size={15} /> {checkingOut ? 'Сохранение...' : 'Завершить смену'}</Button>}
          {isActive && hasActiveTask && <Button variant="outline" onClick={() => navigate('/tasks')}>Открыть задачу</Button>}
          <Button variant="ghost" onClick={() => navigate('/attendance')}><CalendarCheck size={15} /> Мой табель</Button>
        </div>
      </div>

      <Modal open={checkInOpen} onClose={() => setCheckInOpen(false)} title="Отметить приход" size="sm">
        <form className="users-modal-form" onSubmit={(e) => void submitCheckIn(e)}>
          <label><span>Объект</span><CustomSelect fullWidth value={checkInObjectId} onValueChange={setCheckInObjectId} options={objects.map((o) => ({ value: o.id, label: o.name }))} /></label>
          {checkInError && <p className="users-modal-error" role="alert">{checkInError}</p>}
          <div className="users-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setCheckInOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={checkingIn}>{checkingIn ? 'Сохранение...' : 'Отметить'}</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
