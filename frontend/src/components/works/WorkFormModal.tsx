import { useEffect, useMemo, useState } from "react";
import { Paperclip, X } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { CustomSelect } from "../ui/CustomSelect";
import { mockObjects } from "../../data/mockObjects";
import { mockBrigades } from "../../data/mockAssignments";
import { WORK_SECTIONS } from "../../data/mockWorks";
import { WORK_STATUS_CONFIG, WORK_PRIORITY_CONFIG } from "../../utils/workStatus";
import { cn } from "../../utils/cn";
import type { Work, WorkPriority, WorkSectionKey, WorkStatus } from "../../types";

interface FormState {
  title: string;
  code: string;
  objectId: string;
  sectionId: WorkSectionKey;
  description: string;
  responsible: string;
  brigadeId: string;
  plannedStart: string;
  plannedEnd: string;
  progress: string;
  status: WorkStatus;
  priority: WorkPriority;
  budget: string;
  parentWorkId: string;
  dependencyIds: string[];
}

function emptyForm(): FormState {
  return {
    title: "",
    code: "",
    objectId: mockObjects[0].id,
    sectionId: WORK_SECTIONS[0].id,
    description: "",
    responsible: mockBrigades[0].foremanName,
    brigadeId: mockBrigades[0].id,
    plannedStart: "",
    plannedEnd: "",
    progress: "0",
    status: "planned",
    priority: "medium",
    budget: "",
    parentWorkId: "",
    dependencyIds: [],
  };
}

function formFromWork(work: Work): FormState {
  return {
    title: work.title,
    code: work.code,
    objectId: work.objectId,
    sectionId: work.sectionId,
    description: work.description,
    responsible: work.responsible.name,
    brigadeId: work.brigadeId,
    plannedStart: work.plannedStart,
    plannedEnd: work.plannedEnd,
    progress: String(work.progress),
    status: work.status,
    priority: work.priority,
    budget: String(work.budget),
    parentWorkId: work.parentWorkId ?? "",
    dependencyIds: work.dependencyIds,
  };
}

const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const errorInputClass = "border-red focus:border-red focus:ring-red/15";

/** Works that (directly or transitively) depend on `workId` — selecting one of these as a new
 * dependency would create a cycle, so they must be excluded from the picker. */
function findDependents(workId: string, allWorks: Work[]): Set<string> {
  const dependents = new Set<string>();
  let frontier = [workId];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const w of allWorks) {
        if (w.dependencyIds.includes(id) && !dependents.has(w.id)) {
          dependents.add(w.id);
          next.push(w.id);
        }
      }
    }
    frontier = next;
  }
  return dependents;
}

interface WorkFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (work: Work) => void;
  work?: Work | null;
  allWorks: Work[];
  nextCode: string;
}

export function WorkFormModal({ open, onClose, onSave, work, allWorks, nextCode }: WorkFormModalProps) {
  const [form, setForm] = useState<FormState>(() => (work ? formFromWork(work) : { ...emptyForm(), code: nextCode }));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [attachments, setAttachments] = useState<string[]>(work?.attachments ?? []);

  useEffect(() => {
    if (!open) return;
    setForm(work ? formFromWork(work) : { ...emptyForm(), code: nextCode });
    setAttachments(work?.attachments ?? []);
    setErrors({});
  }, [open, work, nextCode]);

  const forbiddenDependencyIds = useMemo(
    () => (work ? findDependents(work.id, allWorks) : new Set<string>()),
    [work, allWorks],
  );

  const parentOptions = allWorks.filter((w) => w.id !== work?.id);
  const dependencyOptions = allWorks.filter((w) => w.id !== work?.id && !forbiddenDependencyIds.has(w.id));

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function toggleDependency(id: string) {
    setForm((prev) => ({
      ...prev,
      dependencyIds: prev.dependencyIds.includes(id)
        ? prev.dependencyIds.filter((d) => d !== id)
        : [...prev.dependencyIds, id],
    }));
  }

  function handleFilesSelected(files: FileList | null) {
    if (!files) return;
    setAttachments((prev) => [...prev, ...Array.from(files).map((f) => f.name)]);
  }

  function validate(): boolean {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.title.trim()) nextErrors.title = "Укажите название работы";
    if (!form.code.trim()) nextErrors.code = "Укажите код работы";
    else if (allWorks.some((w) => w.code === form.code.trim() && w.id !== work?.id)) {
      nextErrors.code = "Такой код уже используется";
    }
    if (!form.plannedStart) nextErrors.plannedStart = "Укажите дату начала";
    if (!form.plannedEnd) nextErrors.plannedEnd = "Укажите дату завершения";
    if (form.plannedStart && form.plannedEnd && form.plannedEnd < form.plannedStart) {
      nextErrors.plannedEnd = "Завершение не может быть раньше начала";
    }
    const progressNum = Number(form.progress);
    if (Number.isNaN(progressNum) || progressNum < 0 || progressNum > 100) {
      nextErrors.progress = "Прогресс от 0 до 100";
    }
    if (!form.budget || Number(form.budget) <= 0) nextErrors.budget = "Бюджет должен быть больше нуля";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const object = mockObjects.find((o) => o.id === form.objectId);
    const brigade = mockBrigades.find((b) => b.id === form.brigadeId);
    const section = WORK_SECTIONS.find((s) => s.id === form.sectionId);
    if (!object || !brigade || !section) return;

    const durationDays = Math.max(
      1,
      Math.round(
        (new Date(`${form.plannedEnd}T00:00:00`).getTime() - new Date(`${form.plannedStart}T00:00:00`).getTime()) / 86_400_000,
      ),
    );
    const progress = Number(form.progress);
    const id = work?.id ?? `work-new-${Date.now()}`;

    const saved: Work = {
      id,
      code: form.code.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      objectId: object.id,
      objectName: object.name,
      objectType: object.objectType,
      imageUrl: object.imageUrl,
      sectionId: section.id,
      sectionName: section.name,
      responsible: { name: form.responsible, role: "Прораб" },
      brigadeId: brigade.id,
      brigadeName: brigade.name,
      plannedStart: form.plannedStart,
      plannedEnd: form.plannedEnd,
      actualStart: work?.actualStart ?? (progress > 0 ? form.plannedStart : null),
      actualEnd: work?.actualEnd ?? (form.status === "completed" ? form.plannedEnd : null),
      plannedDurationDays: durationDays,
      progress,
      status: form.status,
      priority: form.priority,
      budget: Number(form.budget),
      parentWorkId: form.parentWorkId || null,
      dependencyIds: form.dependencyIds,
      attachments,
      comments: work?.comments ?? [],
      progressHistory: work?.progressHistory ?? [
        { id: `${id}-hist-1`, date: form.plannedStart, progress, note: "Работа создана", author: form.responsible },
      ],
    };
    onSave(saved);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={work ? "Редактировать работу" : "Добавить работу"}
      description="Заполните параметры работы, сроки и ответственных"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSubmit}>{work ? "Сохранить изменения" : "Создать работу"}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Название работы" error={errors.title}>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Например, Устройство фундамента"
              className={cn(inputClass, errors.title && errorInputClass)}
            />
          </Field>
        </div>

        <Field label="Код работы" error={errors.code}>
          <input
            type="text"
            value={form.code}
            onChange={(e) => update("code", e.target.value)}
            placeholder="1.1"
            className={cn(inputClass, errors.code && errorInputClass)}
          />
        </Field>

        <Field label="Приоритет">
          <CustomSelect
            className="mt-1.5"
            value={form.priority}
            onValueChange={(v) => update("priority", v as WorkPriority)}
            options={(Object.keys(WORK_PRIORITY_CONFIG) as WorkPriority[]).map((p) => ({
              value: p,
              label: WORK_PRIORITY_CONFIG[p].label,
            }))}
          />
        </Field>

        <Field label="Объект">
          <CustomSelect
            searchable
            className="mt-1.5"
            value={form.objectId}
            onValueChange={(v) => update("objectId", v)}
            options={mockObjects.map((o) => ({ value: o.id, label: o.name }))}
          />
        </Field>

        <Field label="Раздел">
          <CustomSelect
            className="mt-1.5"
            value={form.sectionId}
            onValueChange={(v) => update("sectionId", v as WorkSectionKey)}
            options={WORK_SECTIONS.map((s) => ({ value: s.id, label: s.name }))}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Описание">
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
              placeholder="Краткое описание содержания работы"
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Ответственный">
          <CustomSelect
            className="mt-1.5"
            value={form.responsible}
            onValueChange={(v) => update("responsible", v)}
            options={mockBrigades.map((b) => ({ value: b.foremanName, label: b.foremanName }))}
          />
        </Field>

        <Field label="Бригада">
          <CustomSelect
            searchable
            className="mt-1.5"
            value={form.brigadeId}
            onValueChange={(v) => {
              const brigade = mockBrigades.find((b) => b.id === v);
              update("brigadeId", v);
              if (brigade) update("responsible", brigade.foremanName);
            }}
            options={mockBrigades.map((b) => ({ value: b.id, label: b.name }))}
          />
        </Field>

        <Field label="Плановая дата начала" error={errors.plannedStart}>
          <input
            type="date"
            value={form.plannedStart}
            onChange={(e) => update("plannedStart", e.target.value)}
            className={cn(inputClass, errors.plannedStart && errorInputClass)}
          />
        </Field>

        <Field label="Плановая дата завершения" error={errors.plannedEnd}>
          <input
            type="date"
            value={form.plannedEnd}
            onChange={(e) => update("plannedEnd", e.target.value)}
            className={cn(inputClass, errors.plannedEnd && errorInputClass)}
          />
        </Field>

        <Field label="Плановая продолжительность">
          <div className={cn(inputClass, "bg-[#FAFAF9] text-ink-secondary")}>
            {form.plannedStart && form.plannedEnd && form.plannedEnd >= form.plannedStart
              ? `${Math.max(1, Math.round((new Date(`${form.plannedEnd}T00:00:00`).getTime() - new Date(`${form.plannedStart}T00:00:00`).getTime()) / 86_400_000))} дней`
              : "—"}
          </div>
        </Field>

        <Field label="Начальный прогресс, %" error={errors.progress}>
          <input
            type="number"
            min={0}
            max={100}
            value={form.progress}
            onChange={(e) => update("progress", e.target.value)}
            className={cn(inputClass, errors.progress && errorInputClass)}
          />
        </Field>

        <Field label="Статус">
          <CustomSelect
            className="mt-1.5"
            value={form.status}
            onValueChange={(v) => update("status", v as WorkStatus)}
            options={(Object.keys(WORK_STATUS_CONFIG) as WorkStatus[]).map((s) => ({
              value: s,
              label: WORK_STATUS_CONFIG[s].label,
            }))}
          />
        </Field>

        <Field label="Бюджет работы, сомони" error={errors.budget}>
          <input
            type="number"
            min={0}
            value={form.budget}
            onChange={(e) => update("budget", e.target.value)}
            placeholder="50000"
            className={cn(inputClass, errors.budget && errorInputClass)}
          />
        </Field>

        <Field label="Родительская работа">
          <CustomSelect
            searchable
            clearable
            className="mt-1.5"
            placeholder="Нет"
            value={form.parentWorkId}
            onValueChange={(v) => update("parentWorkId", v)}
            options={parentOptions.map((w) => ({ value: w.id, label: `${w.code} — ${w.title}` }))}
          />
        </Field>

        <div className="sm:col-span-2">
          <p className="text-sm font-medium text-ink">Зависимости</p>
          <div className="mt-1.5 max-h-32 space-y-1 overflow-y-auto rounded-[10px] border border-border-strong p-2">
            {dependencyOptions.length === 0 && <p className="px-1 py-1 text-xs text-ink-muted">Нет доступных работ</p>}
            {dependencyOptions.map((w) => (
              <label key={w.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm text-ink hover:bg-[#FAFAF9]">
                <input
                  type="checkbox"
                  checked={form.dependencyIds.includes(w.id)}
                  onChange={() => toggleDependency(w.id)}
                  className="h-3.5 w-3.5 rounded border-border-strong accent-primary"
                />
                {w.code} — {w.title}
              </label>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <p className="text-sm font-medium text-ink">Вложения</p>
          <label className="mt-1.5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-dashed border-border-strong px-3 py-3 text-sm text-ink-secondary hover:bg-[#FAFAF9]">
            <Paperclip size={14} />
            Прикрепить файлы
            <input type="file" multiple className="hidden" onChange={(e) => handleFilesSelected(e.target.files)} />
          </label>
          {attachments.length > 0 && (
            <ul className="mt-2 space-y-1">
              {attachments.map((name, i) => (
                <li key={`${name}-${i}`} className="flex items-center justify-between gap-2 rounded-lg bg-[#FAFAF9] px-3 py-1.5 text-xs text-ink-secondary">
                  <span className="truncate">{name}</span>
                  <button
                    type="button"
                    aria-label={`Удалить ${name}`}
                    onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                    className="shrink-0 text-ink-muted hover:text-red"
                  >
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-ink">
      {label}
      {children}
      {error && <span className="mt-1 block text-xs font-normal text-red">{error}</span>}
    </label>
  );
}
