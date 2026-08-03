import { format, isValid, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

const FALLBACK = "—";

/** Parses only if given a non-empty string that resolves to a real date; never throws. */
function safeParse(isoDate: string | null | undefined): Date | null {
  if (!isoDate) return null;
  const parsed = parseISO(isoDate);
  return isValid(parsed) ? parsed : null;
}

export function formatDateRu(isoDate: string | null | undefined): string {
  const parsed = safeParse(isoDate);
  if (!parsed) return FALLBACK;
  return format(parsed, "d MMM yyyy", { locale: ru }).replace(".", "");
}

export function formatDateShort(isoDate: string | null | undefined): string {
  const parsed = safeParse(isoDate);
  return parsed ? format(parsed, "dd.MM.yyyy") : FALLBACK;
}

export function formatDateTimeShort(isoDateTime: string | null | undefined): string {
  const parsed = safeParse(isoDateTime);
  return parsed ? format(parsed, "dd.MM.yyyy HH:mm") : FALLBACK;
}

const WEEKDAY_SHORT_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export function formatWeekdayShort(isoDate: string | null | undefined): string {
  const parsed = safeParse(isoDate);
  return parsed ? WEEKDAY_SHORT_RU[parsed.getDay()] : FALLBACK;
}
