import { differenceInMonths, differenceInYears, parseISO } from "date-fns";
import type { AppStrings } from "../lib/i18n/appStrings";

export function calculateAge(birthDateIso: string): number {
  return differenceInYears(new Date(), parseISO(birthDateIso));
}

export function formatTenure(hireDateIso: string, s: AppStrings["employees"]): string {
  const totalMonths = Math.max(0, differenceInMonths(new Date(), parseISO(hireDateIso)));
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years === 0) return s.tenureMonthsOnly(months);
  if (months === 0) return s.tenureYearsOnly(years);
  return s.tenureYearsMonths(years, months);
}
