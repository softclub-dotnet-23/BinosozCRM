import { Card } from "../../ui/Card";
import { Avatar } from "../../ui/Avatar";
import { useLanguage } from "../../../context/LanguageContext";
import { formatRelativeDay } from "../../../utils/date";
import type { PhotoReportComment } from "../../../types";

export function WorkerPhotoRecentComments({ comments, todayIso }: { comments: PhotoReportComment[]; todayIso: string }) {
  const { strings } = useLanguage();
  const s = strings.worker;

  const recent = comments.slice(0, 3);

  return (
    <Card className="p-4">
      <h2 className="text-sm font-bold text-ink">{s.photoCommentsTitle}</h2>
      {recent.length > 0 ? (
        <div className="mt-2 divide-y divide-border">
          {recent.map((c) => (
            <div key={c.id} className="flex items-start gap-2.5 py-2.5">
              <Avatar name={c.authorName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink">{c.text}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {c.authorName} · {formatRelativeDay(c.createdDate, todayIso, s.photoCommentsToday, s.photoCommentsYesterday, false)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-3 text-xs text-ink-muted">{s.emptyReminders}</p>
      )}
    </Card>
  );
}
