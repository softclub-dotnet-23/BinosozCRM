import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Modal } from "../../ui/Modal";
import { Button } from "../../ui/Button";
import { Avatar } from "../../ui/Avatar";
import { useLanguage } from "../../../context/LanguageContext";
import { useToast } from "../../../hooks/useToast";
import { employeesRepository } from "../../../data/repositories";
import type { Employee } from "../../../types";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

interface ChangePhotoModalProps {
  open: boolean;
  onClose: () => void;
  employee: Employee;
}

export function ChangePhotoModal({ open, onClose, employee }: ChangePhotoModalProps) {
  const { strings } = useLanguage();
  const s = strings.worker;
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(s.photoErrorFileType);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(s.photoErrorFileSize);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!preview || submitting) return;
    setSubmitting(true);
    await employeesRepository.update(employee.id, { avatarUrl: preview });
    setSubmitting(false);
    showToast(s.profileToastPhotoUpdated, "success");
    setPreview(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        setPreview(null);
        setError(null);
        onClose();
      }}
      title={s.profileChangePhotoButton}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {strings.common.cancelLabel}
          </Button>
          <Button onClick={handleSave} disabled={!preview || submitting}>
            {submitting && <Loader2 size={15} className="animate-spin" />}
            {s.profileSaveButton}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-4">
        <Avatar name={employee.fullName} src={preview ?? employee.avatarUrl} className="h-28 w-28 text-3xl" />
        <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <ImagePlus size={15} />
          {s.photoUploadButton}
        </Button>
        {error && <p className="text-xs text-red">{error}</p>}
      </div>
    </Modal>
  );
}
