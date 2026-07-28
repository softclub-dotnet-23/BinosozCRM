import { FileText } from "lucide-react";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { useLanguage } from "../../context/LanguageContext";
import { useRepositorySnapshot } from "../../hooks/useRepositoryState";
import { workerDocumentsRepository } from "../../data/repositories";
import { DOCUMENT_ICON, DOCUMENT_TONE_CLASS } from "../../components/worker/workerIcons";
import { downloadWorkerDocument } from "../../utils/workerAnalytics";
import { formatDateShort } from "../../utils/date";
import { cn } from "../../utils/cn";

export default function WorkerDocumentsPage() {
  const { strings } = useLanguage();
  const s = strings.worker;
  const documents = useRepositorySnapshot(workerDocumentsRepository);

  return (
    <AppLayout title={s.documentsPageTitle} subtitle={s.documentsPageSubtitle} titleBelowHeader contentMaxWidth="1600px">
      {documents.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {documents.map((doc) => {
            const Icon = DOCUMENT_ICON[doc.fileType];
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => downloadWorkerDocument(doc)}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-[var(--shadow-card)] transition-colors hover:border-primary/40 hover:bg-surface-2"
              >
                <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", DOCUMENT_TONE_CLASS[doc.fileType])}>
                  <Icon size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{doc.title}</span>
                  <span className="block truncate text-xs text-ink-secondary">{doc.fileName}</span>
                  <span className="mt-1 block text-[11px] text-ink-muted">
                    {doc.sizeLabel} · {formatDateShort(doc.uploadedDate)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <Card className="p-0">
          <EmptyState icon={FileText} title={s.emptyDocuments} />
        </Card>
      )}
    </AppLayout>
  );
}
