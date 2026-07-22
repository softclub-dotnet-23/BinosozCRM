import { differenceInMonths, differenceInYears, parseISO } from "date-fns";
import { pluralizeRu } from "./pluralize";

export function calculateAge(birthDateIso: string): number {
  return differenceInYears(new Date(), parseISO(birthDateIso));
}

export function formatTenure(hireDateIso: string): string {
  const totalMonths = Math.max(0, differenceInMonths(new Date(), parseISO(hireDateIso)));
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const yearsLabel = pluralizeRu(years, "год", "года", "лет");
  const monthsLabel = pluralizeRu(months, "месяц", "месяца", "месяцев");
  if (years === 0) return `${months} ${monthsLabel}`;
  if (months === 0) return `${years} ${yearsLabel}`;
  return `${years} ${yearsLabel} ${months} ${monthsLabel}`;
}
