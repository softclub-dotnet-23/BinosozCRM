import type { ComponentType } from "react";
import { Construction } from "lucide-react";
import { AppLayout } from "../layout/AppLayout";
import { Card } from "./Card";
import { useLanguage } from "../../context/LanguageContext";

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  note?: string;
}

export function PlaceholderPage({ title, subtitle, icon: Icon = Construction, note }: PlaceholderPageProps) {
  const { strings } = useLanguage();
  const c = strings.common;
  return (
    <AppLayout title={title} subtitle={subtitle}>
      <Card className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Icon size={26} />
        </div>
        <p className="text-base font-bold text-ink">{c.placeholderTitle}</p>
        <p className="max-w-sm text-sm text-ink-secondary">
          {note ?? c.placeholderNote}
        </p>
      </Card>
    </AppLayout>
  );
}
