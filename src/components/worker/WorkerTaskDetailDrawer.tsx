import { useEffect, useState } from "react";
import { Camera, PackagePlus, TriangleAlert } from "lucide-react";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";
import { ProgressBar } from "../ui/ProgressBar";
import type { Work } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { cn } from "../../utils/cn";
import { formatDateShort } from "../../utils/date";
import { WORK_PRIORITY_CONFIG, WORK_STATUS_CONFIG, workPriorityLabel, workStatusLabel } from "../../utils/workStatus";
import { worksRepository } from "../../data/repositories";
import { useRepositorySnapshot } from "../../hooks/useRepositoryState";
import { useWorkerScope } from "../../utils/workerAccess";

interface WorkerTaskDetailDrawerProps {
  workId: string | null;
  onClose: () => void;
  onOpenPhotoReport: (workId: string) => void;
  onOpenProblemReport: (workId: string) => void;
  onOpenMaterialRequest?: (workId: string) => void;
}

export function WorkerTaskDetailDrawer({ workId, onClose, onOpenPhotoReport, onOpenProblemReport, onOpenMaterialRequest }: WorkerTaskDetailDrawerProps) {
  const { user } = useAuth();
  const { strings } = useLanguage();
  const s = strings.worker;
  const { employee } = useWorkerScope(user);
  const works = useRepositorySnapshot(worksRepository);
  const [updating, setUpdating] = useState(false);
  const [progressDraft, setProgressDraft] = useState<number | null>(null);
  const work: Work | undefined = works.find((w) => w.id === workId);

  useEffect(() => {
    setProgressDraft(work?.progress ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [work?.id]);

  async function handleStart() {
    if (!work || updating) return;
    setUpdating(true);
    const today = new Date().toISOString().slice(0, 10);
    await worksRepository.update(work.id, { status: "in_progress", actualStart: work.actualStart ?? today });
    setUpdating(false);
  }

  async function handleSaveProgress() {
    if (!work || updating || progressDraft === null || progressDraft === work.progress) return;
    setUpdating(true);
    const clamped = Math.max(0, Math.min(100, Math.round(progressDraft)));
    await worksRepository.update(work.id, {
      progress: clamped,
      progressHistory: [
        ...work.progressHistory,
        { id: `${work.id}-hist-${work.progressHistory.length + 1}`, date: new Date().toISOString().slice(0, 10), progress: clamped, note: "Обновлено работником", author: employee?.fullName ?? user?.fullName ?? "" },
      ],
    });
    setUpdating(false);
  }

  async function handleSubmitReview() {
    if (!work || updating) return;
    setUpdating(true);
    await worksRepository.update(work.id, { status: "on_review" });
    setUpdating(false);
  }

  return (
    <Drawer open={!!work} onClose={onClose} title={work?.title ?? s.taskDetailTitle}>
      {work && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", WORK_STATUS_CONFIG[work.status].className)}>
              {workStatusLabel(strings.works, work.status)}
            </span>
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", WORK_PRIORITY_CONFIG[work.priority].className)}>
              {workPriorityLabel(strings.works, work.priority)}
            </span>
          </div>

          <p className="text-sm text-ink-secondary">{work.description}</p>

          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-secondary">{s.taskDetailObject}</dt>
              <dd className="text-right font-medium text-ink">{work.objectName}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-secondary">{s.taskDetailDates}</dt>
              <dd className="text-right font-medium text-ink">
                {formatDateShort(work.plannedStart)} – {formatDateShort(work.plannedEnd)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-secondary">{s.taskDetailAssignedBy}</dt>
              <dd className="text-right font-medium text-ink">{work.responsible.name}</dd>
            </div>
          </dl>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="text-ink-secondary">{s.taskDetailProgress}</span>
              <span className="font-semibold text-ink">{work.progress}%</span>
            </div>
            <ProgressBar value={work.progress} tone={work.progress >= 66 ? "green" : work.progress >= 33 ? "orange" : "red"} />
          </div>

          {work.status === "in_progress" && (
            <div className="rounded-xl bg-surface-2 p-3">
              <label htmlFor="progress-draft-input" className="mb-1.5 block text-xs font-semibold text-ink-secondary">
                {s.actionUpdateProgress}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="progress-draft-input"
                  type="range"
                  min={0}
                  max={100}
                  value={progressDraft ?? 0}
                  onChange={(e) => setProgressDraft(Number(e.target.value))}
                  className="h-1.5 flex-1 accent-primary"
                />
                <span className="w-10 shrink-0 text-right text-sm font-semibold tabular text-ink">{progressDraft ?? 0}%</span>
              </div>
              <Button size="sm" className="mt-2 w-full" onClick={handleSaveProgress} disabled={updating || progressDraft === work.progress}>
                {s.actionSaveProgress}
              </Button>
            </div>
          )}

          {work.comments.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-ink-secondary">{s.taskDetailComments}</p>
              <div className="space-y-2">
                {work.comments.map((c) => (
                  <div key={c.id} className="rounded-lg bg-surface-2 px-3 py-2">
                    <p className="text-xs font-semibold text-ink">{c.author}</p>
                    <p className="mt-0.5 text-xs text-ink-secondary">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 border-t border-border pt-4">
            {work.status === "planned" && (
              <Button className="w-full" onClick={handleStart} disabled={updating}>
                {s.actionStart}
              </Button>
            )}
            {work.status === "in_progress" && (
              <Button className="w-full" onClick={handleSubmitReview} disabled={updating}>
                {s.actionSubmitReview}
              </Button>
            )}
            <Button variant="outline" className="w-full" onClick={() => onOpenPhotoReport(work.id)}>
              <Camera size={15} /> {s.actionUploadPhoto}
            </Button>
            {onOpenMaterialRequest && (
              <Button variant="outline" className="w-full" onClick={() => onOpenMaterialRequest(work.id)}>
                <PackagePlus size={15} /> {s.actionRequestMaterial}
              </Button>
            )}
            <Button variant="ghost" className="w-full text-red hover:bg-red-soft" onClick={() => onOpenProblemReport(work.id)}>
              <TriangleAlert size={15} /> {s.actionReportProblemLong}
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
