import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { CustomSelect } from "../ui/CustomSelect";
import { TeamBuilder } from "./TeamBuilder";
import { mockObjects } from "../../data/mockObjects";
import { mockEmployees } from "../../data/mockEmployees";
import { BRIGADE_STATUS_CONFIG, brigadeStatusLabel } from "../../utils/brigadeStatus";
import { cn } from "../../utils/cn";
import { useLanguage } from "../../context/LanguageContext";
import type { AppStrings } from "../../lib/i18n/appStrings";
import type { Brigade, BrigadeStatus } from "../../types";

interface FormState {
  name: string;
  specialization: string;
  foremanName: string;
  description: string;
  status: BrigadeStatus;
  createdDate: string;
  objectId: string;
  currentWork: string;
  plannedStart: string;
  plannedEnd: string;
  targetEfficiency: string;
  comment: string;
}

function emptyForm(nextNumber: number, s: AppStrings["brigades"]): FormState {
  return {
    name: s.defaultNamePrefix(nextNumber),
    specialization: "",
    foremanName: "",
    description: "",
    status: "forming",
    createdDate: new Date().toISOString().slice(0, 10),
    objectId: mockObjects[0].id,
    currentWork: "",
    plannedStart: "",
    plannedEnd: "",
    targetEfficiency: "70",
    comment: "",
  };
}

const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const errorInputClass = "border-red focus:border-red focus:ring-red/15";

interface CreateBrigadeModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (brigade: Brigade, asDraft: boolean) => void;
  nextNumber: number;
}

export function CreateBrigadeModal({ open, onClose, onSave, nextNumber }: CreateBrigadeModalProps) {
  const { strings } = useLanguage();
  const s = strings.brigades;
  const c = strings.common;
  const [form, setForm] = useState<FormState>(() => emptyForm(nextNumber, s));
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | "members", string>>>({});

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(nextNumber, s));
    setMemberIds([]);
    setErrors({});
  }, [open, nextNumber, s]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function toggleMember(id: string) {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
    setErrors((prev) => ({ ...prev, members: undefined }));
  }

  function validate(): boolean {
    const nextErrors: Partial<Record<keyof FormState | "members", string>> = {};
    if (!form.name.trim()) nextErrors.name = s.errorNameRequired;
    if (!form.specialization.trim()) nextErrors.specialization = s.errorSpecializationRequired;
    if (!form.foremanName.trim()) nextErrors.foremanName = s.errorForemanRequired;
    if (memberIds.length === 0) nextErrors.members = s.errorMembersRequired;
    if (
      form.foremanName.trim() &&
      memberIds.some((id) => mockEmployees.find((e) => e.id === id)?.fullName.toLowerCase() === form.foremanName.trim().toLowerCase())
    ) {
      nextErrors.foremanName = s.errorForemanIsMember;
    }
    if (form.plannedStart && form.plannedEnd && form.plannedEnd < form.plannedStart) {
      nextErrors.plannedEnd = s.errorPlannedEndBeforeStartBrigade;
    }
    const efficiencyNum = Number(form.targetEfficiency);
    if (Number.isNaN(efficiencyNum) || efficiencyNum < 0 || efficiencyNum > 100) {
      nextErrors.targetEfficiency = s.errorEfficiencyRange;
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function buildBrigade(asDraft: boolean): Brigade | null {
    if (!validate()) return null;
    const object = mockObjects.find((o) => o.id === form.objectId);
    if (!object) return null;

    const members = mockEmployees.filter((e) => memberIds.includes(e.id));
    const workersCount = members.filter((m) => m.memberRole !== "helper").length;
    const helpersCount = members.filter((m) => m.memberRole === "helper").length;
    const membersCount = members.length;

    return {
      id: `brigade-new-${Date.now()}`,
      number: nextNumber,
      name: form.name.trim(),
      specialization: form.specialization.trim(),
      foremanName: form.foremanName.trim(),
      membersCount,
      workersCount,
      helpersCount,
      objectId: object.id,
      objectName: object.name,
      objectType: object.objectType,
      imageUrl: object.imageUrl,
      sectionName: form.currentWork.trim() || s.notDefined,
      currentWork: form.currentWork.trim() || s.notAssigned,
      workProgress: 0,
      remainingDays: 0,
      efficiency: 0,
      status: asDraft ? "forming" : form.status,
      createdDate: form.createdDate,
      staffingCapacity: Math.max(membersCount, Math.round(Number(form.targetEfficiency) / 10) || membersCount),
    };
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={s.createModalTitle}
      description={s.createModalDescription}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {c.cancelLabel}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const brigade = buildBrigade(true);
              if (brigade) onSave(brigade, true);
            }}
          >
            {s.saveDraftButton}
          </Button>
          <Button
            onClick={() => {
              const brigade = buildBrigade(false);
              if (brigade) onSave(brigade, false);
            }}
          >
            {s.createBrigade}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={s.fieldName} error={errors.name}>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className={cn(inputClass, errors.name && errorInputClass)}
          />
        </Field>

        <Field label={s.fieldSpecialization} error={errors.specialization}>
          <input
            type="text"
            value={form.specialization}
            onChange={(e) => update("specialization", e.target.value)}
            placeholder={s.fieldSpecializationPlaceholder}
            className={cn(inputClass, errors.specialization && errorInputClass)}
          />
        </Field>

        <Field label={s.fieldForemanName} error={errors.foremanName}>
          <input
            type="text"
            value={form.foremanName}
            onChange={(e) => update("foremanName", e.target.value)}
            placeholder={s.fieldForemanNamePlaceholder}
            className={cn(inputClass, errors.foremanName && errorInputClass)}
          />
        </Field>

        <Field label={c.colStatus}>
          <CustomSelect
            className="mt-1.5"
            value={form.status}
            onValueChange={(v) => update("status", v as BrigadeStatus)}
            options={(Object.keys(BRIGADE_STATUS_CONFIG) as BrigadeStatus[]).map((status) => ({
              value: status,
              label: brigadeStatusLabel(s, status),
            }))}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label={c.descriptionLabel}>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={2}
              placeholder={s.fieldDescriptionPlaceholderBrigade}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label={s.fieldCreatedDate}>
          <input type="date" value={form.createdDate} onChange={(e) => update("createdDate", e.target.value)} className={inputClass} />
        </Field>

        <Field label={c.colObject}>
          <CustomSelect
            searchable
            className="mt-1.5"
            value={form.objectId}
            onValueChange={(v) => update("objectId", v)}
            options={mockObjects.map((o) => ({ value: o.id, label: o.name }))}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label={s.fieldCurrentWork}>
            <input
              type="text"
              value={form.currentWork}
              onChange={(e) => update("currentWork", e.target.value)}
              placeholder={s.fieldCurrentWorkPlaceholder}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label={strings.works.fieldPlannedStart}>
          <input type="date" value={form.plannedStart} onChange={(e) => update("plannedStart", e.target.value)} className={inputClass} />
        </Field>

        <Field label={strings.works.fieldPlannedEnd} error={errors.plannedEnd}>
          <input
            type="date"
            value={form.plannedEnd}
            onChange={(e) => update("plannedEnd", e.target.value)}
            className={cn(inputClass, errors.plannedEnd && errorInputClass)}
          />
        </Field>

        <Field label={s.fieldTargetEfficiency} error={errors.targetEfficiency}>
          <input
            type="number"
            min={0}
            max={100}
            value={form.targetEfficiency}
            onChange={(e) => update("targetEfficiency", e.target.value)}
            className={cn(inputClass, errors.targetEfficiency && errorInputClass)}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label={c.commentLabel}>
            <textarea
              value={form.comment}
              onChange={(e) => update("comment", e.target.value)}
              rows={2}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <TeamBuilder selectedIds={memberIds} onToggle={toggleMember} foremanName={form.foremanName} />
          {errors.members && <p className="mt-1.5 text-xs font-normal text-red">{errors.members}</p>}
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
