import { useRef, useState } from "react";
import { Camera, Loader2, Send, X } from "lucide-react";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { CustomSelect } from "../../ui/CustomSelect";
import { useAuth } from "../../../context/AuthContext";
import { useLanguage } from "../../../context/LanguageContext";
import { useToast } from "../../../hooks/useToast";
import { useWorkerScope } from "../../../utils/workerAccess";
import { photoReportsRepository } from "../../../data/repositories";
import { buildPhotoReport } from "../../../utils/photoReports";
import { cn } from "../../../utils/cn";
import type { Work } from "../../../types";

const MAX_IMAGES = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export function WorkerPhotoUploadCard({ defaultWorkId, id }: { defaultWorkId?: string | null; id?: string }) {
  const { user } = useAuth();
  const { strings } = useLanguage();
  const s = strings.worker;
  const { showToast } = useToast();
  const { employee, brigadeWorks } = useWorkerScope(user);
  const fileRef = useRef<HTMLInputElement>(null);

  const [workId, setWorkId] = useState(defaultWorkId ?? "");
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedWork: Work | null = brigadeWorks.find((w) => w.id === workId) ?? null;
  const workOptions = brigadeWorks.map((w) => ({ value: w.id, label: w.title }));

  function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    setError(null);
    for (const file of files) {
      if (images.length >= MAX_IMAGES) {
        setError(s.photoErrorMaxImages);
        break;
      }
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(s.photoErrorFileType);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError(s.photoErrorFileSize);
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") setImages((prev) => (prev.length >= MAX_IMAGES ? prev : [...prev, reader.result as string]));
      };
      reader.readAsDataURL(file);
    }
  }

  function reset() {
    setWorkId(defaultWorkId ?? "");
    setComment("");
    setImages([]);
    setTouched(false);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const workError = touched && !workId ? s.photoErrorWorkRequired : null;
  const imagesError = touched && images.length === 0 ? s.photoErrorImagesRequired : null;

  async function handleSubmit() {
    setTouched(true);
    if (!employee || !selectedWork || images.length === 0 || submitting) return;
    setSubmitting(true);
    await photoReportsRepository.create(
      buildPhotoReport({
        employeeId: employee.id,
        employeeName: employee.fullName,
        workId: selectedWork.id,
        workTitle: selectedWork.title,
        objectName: selectedWork.objectName,
        sectionName: selectedWork.sectionName,
        images,
        comment: comment.trim(),
      }),
    );
    setSubmitting(false);
    showToast(s.toastPhotoSubmitted, "success");
    reset();
  }

  return (
    <Card id={id} className="p-4">
      <h2 className="text-sm font-bold text-ink">{s.photoUploadCardTitle}</h2>
      <div className="mt-3.5 space-y-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex min-h-27 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[10px] border-2 border-dashed px-3 py-4 text-center transition-colors",
            dragActive ? "border-primary bg-primary-soft" : "border-border-strong hover:bg-surface-2",
          )}
        >
          <Camera size={24} className="text-primary" />
          <p className="text-sm font-medium text-ink">{s.photoDropzoneTitle}</p>
          <p className="text-xs text-ink-muted">{s.photoDropzoneSubtitle}</p>
        </div>

        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt="" className="h-14 w-14 rounded-lg border border-border object-cover" />
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label={strings.common.cancelLabel}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
        {(error || imagesError) && <p className="text-xs text-red">{error ?? imagesError}</p>}

        <div>
          <label htmlFor="photo-upload-work" className="mb-1.5 block text-xs font-semibold text-ink-secondary">
            {s.photoUploadWorkLabel}
          </label>
          <CustomSelect
            id="photo-upload-work"
            value={workId}
            onValueChange={setWorkId}
            options={workOptions}
            placeholder={s.photoUploadWorkPlaceholder}
            error={!!workError}
          />
          {workError && <p className="mt-1 text-xs text-red">{workError}</p>}
        </div>

        <div>
          <label htmlFor="photo-upload-object" className="mb-1.5 block text-xs font-semibold text-ink-secondary">
            {s.photoUploadObjectLabel}
          </label>
          <input
            id="photo-upload-object"
            disabled
            value={selectedWork?.objectName ?? ""}
            placeholder={s.photoUploadObjectPlaceholder}
            className="h-10 w-full rounded-[10px] border border-border-strong bg-surface-1 px-3 text-sm text-ink-secondary placeholder:text-ink-muted"
          />
        </div>

        <div>
          <label htmlFor="photo-upload-comment" className="mb-1.5 block text-xs font-semibold text-ink-secondary">
            {s.photoModalComment}
          </label>
          <textarea
            id="photo-upload-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={s.photoModalCommentPlaceholder}
            rows={2}
            className="w-full rounded-[10px] border border-border-strong bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>

        <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
          {s.photoModalSubmit}
        </Button>
      </div>
    </Card>
  );
}
