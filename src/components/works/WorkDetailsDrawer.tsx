import { useState } from "react";
import { Calendar, CheckCircle2, Clock, Paperclip, Pencil, TrendingUp, Users, Wallet } from "lucide-react";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";
import { CustomSelect } from "../ui/CustomSelect";
import { ObjectImage } from "../ui/ObjectImage";
import { Avatar } from "../ui/Avatar";
import { IconSummaryRow } from "../ui/IconSummaryRow";
import { WorkStatusBadge } from "./WorkStatusBadge";
import { WorkProgressBar } from "./WorkProgressBar";
import { formatCurrency } from "../../utils/format";
import { formatDateShort } from "../../utils/date";
import {
  WORK_STATUS_CONFIG,
  workHistoryNoteLabel,
  workPriorityLabel,
  workSectionLabel,
  workStatusLabel,
} from "../../utils/workStatus";
import { useLanguage } from "../../context/LanguageContext";
import type { Work, WorkStatus } from "../../types";

interface WorkDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  work: Work | null;
  allWorks: Work[];
  onEdit: (work: Work) => void;
  onUpdateProgress: (work: Work) => void;
  onChangeStatus: (workId: string, status: WorkStatus) => void;
  onComplete: (workId: string) => void;
  onAddComment: (workId: string, text: string) => void;
  /** Hides edit / status-change / complete controls for roles without Prorab/Admin-level management rights (e.g. Brigadir). Progress updates and comments stay available either way. Defaults to true (existing behavior). */
  allowManagement?: boolean;
}

export function WorkDetailsDrawer({
  open,
  onClose,
  work,
  allWorks,
  onEdit,
  onUpdateProgress,
  onChangeStatus,
  onComplete,
  onAddComment,
  allowManagement = true,
}: WorkDetailsDrawerProps) {
  const [commentDraft, setCommentDraft] = useState("");
  const { strings } = useLanguage();
  const s = strings.works;
  const c = strings.common;

  if (!work) {
    return (
      <Drawer open={open} onClose={onClose} title={s.detailsDefaultTitle}>
        {null}
      </Drawer>
    );
  }

  const isClosed = work.status === "completed" || work.status === "cancelled";
  const dependencies = allWorks.filter((w) => work.dependencyIds.includes(w.id));
  const actualDuration =
    work.actualStart && work.actualEnd
      ? Math.round((new Date(`${work.actualEnd}T00:00:00`).getTime() - new Date(`${work.actualStart}T00:00:00`).getTime()) / 86_400_000)
      : null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`${work.code} — ${work.title}`}
      footer={
        <div className="grid w-full grid-cols-2 gap-2.5">
          {allowManagement && (
            <Button variant="secondary" onClick={() => onEdit(work)}>
              <Pencil size={14} /> {c.edit}
            </Button>
          )}
          <Button variant="outline" className={!allowManagement ? "col-span-2" : undefined} onClick={() => onUpdateProgress(work)}>
            <TrendingUp size={14} /> {s.updateProgressButton}
          </Button>
          {!isClosed && allowManagement && (
            <Button className="col-span-2" onClick={() => onComplete(work.id)}>
              <CheckCircle2 size={14} /> {s.completeWorkButton}
            </Button>
          )}
        </div>
      }
    >
      <div className="-mx-6 -mt-5 h-40 w-auto overflow-hidden">
        <ObjectImage src={work.imageUrl} type={work.objectType} alt={work.objectName} />
      </div>

      <div className="mt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-ink-secondary">
              {work.objectName} • {workSectionLabel(s, work.sectionId)}
            </p>
            <p className="text-base font-bold text-ink">{work.title}</p>
          </div>
          <WorkStatusBadge status={work.status} />
        </div>

        {allowManagement && (
          <label className="mt-2 block text-xs text-ink-secondary">
            {s.changeStatusLabel}
            <CustomSelect
              className="mt-1"
              value={work.status}
              onValueChange={(v) => onChangeStatus(work.id, v as WorkStatus)}
              options={(Object.keys(WORK_STATUS_CONFIG) as WorkStatus[]).map((status) => ({
                value: status,
                label: workStatusLabel(s, status),
              }))}
            />
          </label>
        )}

        <div className="mt-4 flex items-center gap-2.5">
          <Avatar name={work.responsible.name} size="sm" />
          <div>
            <p className="text-xs text-ink-secondary">
              {work.responsible.role === "Прораб" ? c.roleLabels.prorab : work.responsible.role} · {work.brigadeName}
            </p>
            <p className="text-sm font-semibold text-ink">{work.responsible.name}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          <IconSummaryRow
            icon={Calendar}
            label={s.plannedTermsLabel}
            value={`${formatDateShort(work.plannedStart)} – ${formatDateShort(work.plannedEnd)}`}
          />
          <IconSummaryRow
            icon={Clock}
            label={s.actualTermsLabel}
            value={work.actualStart ? `${formatDateShort(work.actualStart)} – ${work.actualEnd ? formatDateShort(work.actualEnd) : "…"}` : s.notStartedLabel}
          />
          <IconSummaryRow icon={Calendar} label={s.fieldPlannedDuration} value={s.durationDaysValue(work.plannedDurationDays)} />
          <IconSummaryRow
            icon={Clock}
            label={s.actualDurationLabel}
            value={actualDuration !== null ? s.durationDaysValue(actualDuration) : s.noValue}
          />
          <IconSummaryRow icon={Wallet} label={s.budgetLabel} value={formatCurrency(work.budget)} />
          <IconSummaryRow icon={Users} label={s.priorityLabel} value={workPriorityLabel(s, work.priority)} />
        </div>

        <div className="my-4 border-t border-border" />

        <div>
          <div className="flex items-center justify-between text-xs text-ink-secondary">
            <span>{s.progressExecutionLabel}</span>
          </div>
          <WorkProgressBar progress={work.progress} status={work.status} className="mt-2" barClassName="flex-1" />
        </div>

        {dependencies.length > 0 && (
          <>
            <div className="my-4 border-t border-border" />
            <div>
              <p className="text-sm font-semibold text-ink">{s.dependenciesLabel}</p>
              <ul className="mt-2 space-y-1">
                {dependencies.map((dep) => (
                  <li key={dep.id} className="text-xs text-ink-secondary">
                    {dep.code} — {dep.title}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {work.description && (
          <>
            <div className="my-4 border-t border-border" />
            <div>
              <p className="text-sm font-semibold text-ink">{c.descriptionLabel}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">{work.description}</p>
            </div>
          </>
        )}

        <div className="my-4 border-t border-border" />
        <div>
          <p className="text-sm font-semibold text-ink">{s.fieldAttachments}</p>
          {work.attachments.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {work.attachments.map((name) => (
                <li key={name} className="flex items-center gap-2 rounded-lg bg-surface-1 px-3 py-1.5 text-xs text-ink-secondary">
                  <Paperclip size={12} className="shrink-0 text-ink-muted" />
                  <span className="truncate">{name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-xs text-ink-muted">{s.noAttachments}</p>
          )}
        </div>

        <div className="my-4 border-t border-border" />
        <div>
          <p className="text-sm font-semibold text-ink">{s.progressHistoryLabel}</p>
          <ul className="mt-2 space-y-2.5">
            {[...work.progressHistory].reverse().map((entry) => (
              <li key={entry.id} className="text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">{entry.progress}%</span>
                  <span className="text-ink-muted">{formatDateShort(entry.date)}</span>
                </div>
                <p className="mt-0.5 text-ink-secondary">{workHistoryNoteLabel(s, entry.note)}</p>
                <p className="text-ink-muted">{entry.author}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="my-4 border-t border-border" />
        <div>
          <p className="text-sm font-semibold text-ink">{s.commentsLabel}</p>
          {work.comments.length > 0 ? (
            <ul className="mt-2 space-y-2.5">
              {work.comments.map((comment) => (
                <li key={comment.id} className="rounded-lg bg-surface-1 px-3 py-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink">{comment.author}</span>
                    <span className="text-ink-muted">{formatDateShort(comment.date)}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-secondary">{comment.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-xs text-ink-muted">{s.noCommentsYet}</p>
          )}
          <div className="mt-2.5 flex items-center gap-2">
            <input
              type="text"
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder={s.addCommentPlaceholder}
              className="flex-1 rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              onKeyDown={(e) => {
                if (e.key === "Enter" && commentDraft.trim()) {
                  onAddComment(work.id, commentDraft.trim());
                  setCommentDraft("");
                }
              }}
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (!commentDraft.trim()) return;
                onAddComment(work.id, commentDraft.trim());
                setCommentDraft("");
              }}
            >
              {s.addButton}
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
