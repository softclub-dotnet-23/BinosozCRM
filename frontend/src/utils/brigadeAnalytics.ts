import { SPECIALTY_BUCKET_LABEL } from "../data/mockEmployees";
import type { Brigade, Employee } from "../types";

export interface BrigadeKpis {
  totalBrigades: number;
  activeBrigades: number;
  totalMembers: number;
  totalWorkers: number;
  assignedWorksCount: number;
  averageEfficiency: number;
}

export function computeBrigadeKpis(brigades: Brigade[], assignedWorksCount: number): BrigadeKpis {
  const totalBrigades = brigades.length;
  const activeBrigades = brigades.filter((b) => b.status !== "paused" && b.status !== "inactive").length;
  const totalMembers = brigades.reduce((sum, b) => sum + b.membersCount, 0);
  const totalWorkers = brigades.reduce((sum, b) => sum + b.workersCount, 0);
  const averageEfficiency =
    totalBrigades > 0 ? Math.round(brigades.reduce((sum, b) => sum + b.efficiency, 0) / totalBrigades) : 0;
  return { totalBrigades, activeBrigades, totalMembers, totalWorkers, assignedWorksCount, averageEfficiency };
}

export interface SpecializationSlice {
  key: string;
  label: string;
  value: number;
  percent: number;
  color: string;
}

const BUCKET_COLORS: Record<string, string> = {
  monolithic: "#2869C9",
  masonry: "#FF6B00",
  finishing: "#22A447",
  electrical: "#9333EA",
  plumbing: "#F58A1F",
  other: "#9CA3AF",
};

const SPECIALTY_TO_BUCKET: Record<string, string> = {
  Бетонщик: "monolithic",
  Арматурщик: "monolithic",
  Опалубщик: "monolithic",
  Каменщик: "masonry",
  Кладочник: "masonry",
  Отделочник: "finishing",
  Штукатур: "finishing",
  Маляр: "finishing",
  Плиточник: "finishing",
  Электромонтажник: "electrical",
  Сантехник: "plumbing",
  Разнорабочий: "other",
  Стропальщик: "other",
  Подсобник: "other",
};

export function computeSpecializationDistribution(employees: Employee[]): SpecializationSlice[] {
  const brigaded = employees.filter((e) => e.brigadeId !== null);
  const counts: Record<string, number> = {};
  for (const e of brigaded) {
    const bucket = SPECIALTY_TO_BUCKET[e.specialty] ?? "other";
    counts[bucket] = (counts[bucket] ?? 0) + 1;
  }
  const total = brigaded.length;
  return Object.entries(SPECIALTY_BUCKET_LABEL).map(([key, label]) => {
    const value = counts[key] ?? 0;
    return { key, label, value, percent: total > 0 ? Math.round((value / total) * 100) : 0, color: BUCKET_COLORS[key] };
  });
}

export interface BrigadeActivityRow {
  id: string;
  name: string;
  efficiency: number;
}

export function computeBrigadeActivity(brigades: Brigade[], limit = 6): BrigadeActivityRow[] {
  return [...brigades]
    .sort((a, b) => b.efficiency - a.efficiency)
    .slice(0, limit)
    .map((b) => ({ id: b.id, name: b.name, efficiency: b.efficiency }));
}

export function activityTone(value: number): "green" | "orange" | "red" {
  if (value >= 65) return "green";
  if (value >= 40) return "orange";
  return "red";
}

export function completenessPercent(brigade: Brigade): number {
  return Math.min(100, Math.round((brigade.membersCount / brigade.staffingCapacity) * 100));
}

export function completenessColor(percent: number): string {
  if (percent >= 90) return "#16803C";
  if (percent >= 70) return "#22A447";
  if (percent >= 50) return "#F58A1F";
  return "#E83939";
}

export function completenessLabel(percent: number): string {
  if (percent >= 90) return "Отличная укомплектованность";
  if (percent >= 70) return "Хорошая укомплектованность";
  if (percent >= 50) return "Средняя укомплектованность";
  return "Низкая укомплектованность";
}
