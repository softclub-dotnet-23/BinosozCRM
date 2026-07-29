import { Award, CheckCircle2, ExternalLink, FileText, IdCard } from "lucide-react";
import { Card } from "../../ui/Card";
import { useLanguage } from "../../../context/LanguageContext";
import { useToast } from "../../../hooks/useToast";
import { formatDateShort } from "../../../utils/date";
import { cn } from "../../../utils/cn";
import type { EmployeeDocument, EmployeeDocumentType } from "../../../types";

const DOC_ICON: Record<EmployeeDocumentType, typeof IdCard> = { identity: IdCard, safetyInstruction: Award, contract: FileText };
const DOC_TONE_CLASS: Record<EmployeeDocumentType, string> = {
  identity: "bg-blue-soft text-blue",
  safetyInstruction: "bg-warning-soft text-warning",
  contract: "bg-green-soft text-green",
};

/** No real file-storage backend exists anywhere in this app (the same constraint the Photo
 * Reports/Documents pages already document) — "Открыть" produces a real, honest text-manifest
 * download of the document's real metadata, the same pattern downloadWorkerDocument already uses
 * for project documents. */
function openEmployeeDocument(doc: EmployeeDocument): void {
  const manifest = [`Документ: ${doc.title}`, `Файл: ${doc.fileName}`, `Загружен: ${formatDateShort(doc.uploadedDate)}`, doc.validUntil ? `Действует до: ${formatDateShort(doc.validUntil)}` : null]
    .filter(Boolean)
    .join("\n");
  const blob = new Blob([manifest], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = doc.fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function DocumentsCard({ documents }: { documents: EmployeeDocument[] }) {
  const { strings } = useLanguage();
  const s = strings.worker;
  const { showToast } = useToast();

  return (
    <Card className="p-4">
      <h2 className="text-sm font-bold text-ink">{s.profileDocumentsTitle}</h2>
      {documents.length > 0 ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {documents.map((doc) => {
            const Icon = DOC_ICON[doc.type];
            const statusText = doc.validUntil ? s.profileDocumentValidUntil(formatDateShort(doc.validUntil)) : s.profileDocumentUploaded;
            return (
              <div key={doc.id} className="rounded-[10px] border border-border p-3.5">
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", DOC_TONE_CLASS[doc.type])}>
                  <Icon size={16} />
                </span>
                <p className="mt-2.5 text-sm font-semibold text-ink">{doc.title}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-green">
                  <CheckCircle2 size={12} />
                  {statusText}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    openEmployeeDocument(doc);
                    showToast(s.profileDocumentOpened, "success");
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border-strong py-2 text-xs font-semibold text-ink transition-colors hover:bg-surface-2"
                >
                  {s.profileDocumentOpenButton}
                  <ExternalLink size={12} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-xs text-ink-muted">{s.profileDocumentMissing}</p>
      )}
    </Card>
  );
}
