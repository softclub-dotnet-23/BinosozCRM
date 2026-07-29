import type { LucideIcon } from "lucide-react";
import { Camera, Grid3x3, HardHat, Layers, Package, ShieldCheck, Wrench } from "lucide-react";
import { Card } from "../../ui/Card";
import { useLanguage } from "../../../context/LanguageContext";
import { cn } from "../../../utils/cn";

const SKILL_VISUAL: Record<string, { icon: LucideIcon; className: string }> = {
  "Заливка бетона": { icon: Wrench, className: "bg-blue-soft text-blue" },
  "Опалубка": { icon: Layers, className: "bg-blue-soft text-blue" },
  "Армирование": { icon: Grid3x3, className: "bg-purple-soft text-purple" },
  "Техника безопасности": { icon: HardHat, className: "bg-warning-soft text-warning" },
  "Фотоотчёт": { icon: Camera, className: "bg-blue-soft text-blue" },
  "Материалы": { icon: Package, className: "bg-surface-4 text-ink-secondary" },
};

const FALLBACK_VISUAL = { icon: ShieldCheck, className: "bg-surface-4 text-ink-secondary" };

export function SkillsCard({ skills }: { skills: string[] }) {
  const { strings } = useLanguage();
  const s = strings.worker;

  if (skills.length === 0) return null;

  return (
    <Card className="p-4">
      <h2 className="text-sm font-bold text-ink">{s.profileSkillsTitle}</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {skills.map((skill) => {
          const visual = SKILL_VISUAL[skill] ?? FALLBACK_VISUAL;
          const Icon = visual.icon;
          return (
            <div key={skill} className="flex items-center gap-2 rounded-[10px] border border-border px-2.5 py-2.5 transition-colors hover:bg-surface-2">
              <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", visual.className)}>
                <Icon size={14} />
              </span>
              <span className="truncate text-xs font-medium text-ink" title={skill}>{skill}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
