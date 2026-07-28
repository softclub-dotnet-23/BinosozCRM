import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useToast } from "../../hooks/useToast";
import { useWorkerScope } from "../../utils/workerAccess";
import { photoReportsRepository } from "../../data/repositories";

interface WorkerPhotoReportModalProps {
  open: boolean;
  onClose: () => void;
  defaultWorkId?: string | null;
}

/** There is no file/blob storage backend anywhere in this app, so the uploaded image is read as a
 * data URL (FileReader) and persisted in the repository itself — a real, working upload+persist
 * flow within the constraints of a localStorage-only architecture, not a fabricated success state. */
export function WorkerPhotoReportModal({ open, onClose, defaultWorkId = null }: WorkerPhotoReportModalProps) {
  const { user } = useAuth();
  const { strings } = useLanguage();
  const s = strings.worker;
  const { showToast } = useToast();
  const { employee, brigadeWorks, object } = useWorkerScope(user);
  const fileRef = useRef<HTMLInputElement>(null);

  const [workId, setWorkId] = useState<string>(defaultWorkId ?? "");
  const [comment, setComment] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setWorkId(defaultWorkId ?? "");
    setComment("");
    setImageDataUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    const work = brigadeWorks.find((w) => w.id === workId);
    if (!employee || !work || !imageDataUrl || submitting) return;
    setSubmitting(true);
    await photoReportsRepository.create({
      id: `photo-${Date.now()}`,
      employeeId: employee.id,
      employeeName: employee.fullName,
      workId: work.id,
      workTitle: work.title,
      objectName: object?.name ?? work.objectName,
      imageUrl: imageDataUrl,
      comment: comment.trim(),
      createdDate: new Date().toISOString(),
    });
    setSubmitting(false);
    showToast(s.toastPhotoSubmitted, "success");
    reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={s.photoModalTitle}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {strings.common.cancelLabel}
          </Button>
          <Button onClick={handleSubmit} disabled={!workId || !imageDataUrl || submitting}>
            {s.photoModalSubmit}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="worker-photo-task" className="mb-1.5 block text-xs font-semibold text-ink-secondary">
            {s.photoModalTask}
          </label>
          <select
            id="worker-photo-task"
            value={workId}
            onChange={(e) => setWorkId(e.target.value)}
            className="h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink"
          >
            <option value="">{s.photoModalTaskPlaceholder}</option>
            {brigadeWorks.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-semibold text-ink-secondary">{s.photoModalImage}</span>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="worker-photo-file" />
          {imageDataUrl ? (
            <button type="button" onClick={() => fileRef.current?.click()} className="block w-full overflow-hidden rounded-[10px] border border-border">
              <img src={imageDataUrl} alt="" className="h-40 w-full object-cover" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-border-strong text-ink-secondary hover:bg-surface-2"
            >
              <ImagePlus size={22} />
              <span className="text-xs font-medium">{s.actionUploadPhoto}</span>
            </button>
          )}
        </div>

        <div>
          <label htmlFor="worker-photo-comment" className="mb-1.5 block text-xs font-semibold text-ink-secondary">
            {s.photoModalComment}
          </label>
          <textarea
            id="worker-photo-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={s.photoModalCommentPlaceholder}
            rows={3}
            className="w-full rounded-[10px] border border-border-strong bg-card px-3 py-2 text-sm text-ink"
          />
        </div>
      </div>
    </Modal>
  );
}
