import type { ComponentType, ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface ErrorStateProps {
  icon?: ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function ErrorState({ icon: Icon = AlertCircle, title, description, action }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-soft text-red">
        <Icon size={26} />
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        {description && <p className="mt-1 max-w-xs text-sm text-ink-secondary">{description}</p>}
      </div>
      {action}
    </div>
  );
}
