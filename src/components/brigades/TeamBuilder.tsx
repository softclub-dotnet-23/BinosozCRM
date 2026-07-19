import { useState } from "react";
import { Search, X } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { mockEmployees } from "../../data/mockEmployees";

interface TeamBuilderProps {
  selectedIds: string[];
  onToggle: (id: string) => void;
  foremanName: string;
}

export function TeamBuilder({ selectedIds, onToggle, foremanName }: TeamBuilderProps) {
  const [query, setQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");

  const specialties = Array.from(new Set(mockEmployees.map((e) => e.specialty))).sort();

  const available = mockEmployees.filter((e) => {
    if (selectedIds.includes(e.id)) return false;
    if (foremanName && e.fullName.toLowerCase() === foremanName.trim().toLowerCase()) return false;
    if (specialtyFilter !== "all" && e.specialty !== specialtyFilter) return false;
    if (query && !e.fullName.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const selected = mockEmployees.filter((e) => selectedIds.includes(e.id));

  return (
    <div>
      <p className="text-sm font-medium text-ink">Состав бригады</p>
      <div className="mt-1.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-[10px] border border-border-strong">
          <div className="space-y-1.5 border-b border-border p-2">
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск сотрудника..."
                className="w-full rounded-lg border border-border-strong py-1.5 pl-7 pr-2 text-xs focus:border-primary focus:outline-none"
              />
            </div>
            <select
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              className="w-full rounded-lg border border-border-strong px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
            >
              <option value="all">Все специальности</option>
              {specialties.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="max-h-40 space-y-0.5 overflow-y-auto p-1.5">
            {available.length === 0 && <p className="px-2 py-3 text-center text-xs text-ink-muted">Никого не найдено</p>}
            {available.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => onToggle(e.id)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-[#FAFAF9]"
              >
                <Avatar name={e.fullName} size="sm" />
                <span className="min-w-0 flex-1 truncate text-ink">{e.fullName}</span>
                <span className="shrink-0 text-ink-muted">{e.specialty}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[10px] border border-border-strong">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-xs font-semibold text-ink">Выбрано: {selected.length}</p>
          </div>
          <div className="max-h-52 space-y-0.5 overflow-y-auto p-1.5">
            {selected.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-ink-muted">Добавьте участников слева</p>
            )}
            {selected.map((e) => (
              <div key={e.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs">
                <Avatar name={e.fullName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-ink">{e.fullName}</p>
                  <p className="truncate text-ink-muted">{e.specialty}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Убрать ${e.fullName}`}
                  onClick={() => onToggle(e.id)}
                  className="shrink-0 text-ink-muted hover:text-red"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
