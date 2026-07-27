import { format, isValid, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { readJson } from "../lib/storage/localStorageEngine";

const FALLBACK = "—";

/** Parses only if given a non-empty string that resolves to a real date; never throws. */
function safeParse(isoDate: string | null | undefined): Date | null {
  if (!isoDate) return null;
  const parsed = parseISO(isoDate);
  return isValid(parsed) ? parsed : null;
}

const DATE_FORMAT_TOKENS: Record<string, string> = {
  "DD.MM.YYYY": "dd.MM.yyyy",
  "YYYY-MM-DD": "yyyy-MM-dd",
  "MM/DD/YYYY": "MM/dd/yyyy",
};

/** Reads the real, persisted "Формат даты" / "Формат времени" settings (Settings → General) — the
 * same source of truth SettingsPage itself reads and writes, so every date/time display in the app
 * respects the user's choice instead of a hardcoded ru-RU format. */
function dateToken(): string {
  const settings = readJson<{ dateFormat?: string }>("app.settings.v1");
  return DATE_FORMAT_TOKENS[settings?.dateFormat ?? ""] ?? DATE_FORMAT_TOKENS["DD.MM.YYYY"];
}

function timeToken(): string {
  const settings = readJson<{ timeFormat?: string }>("app.settings.v1");
  return settings?.timeFormat === "12" ? "hh:mm a" : "HH:mm";
}

export function formatDateRu(isoDate: string | null | undefined): string {
  const parsed = safeParse(isoDate);
  if (!parsed) return FALLBACK;
  return format(parsed, "d MMM yyyy", { locale: ru }).replace(".", "");
}

export function formatDateShort(isoDate: string | null | undefined): string {
  const parsed = safeParse(isoDate);
  return parsed ? format(parsed, dateToken()) : FALLBACK;
}

export function formatDateTimeShort(isoDateTime: string | null | undefined): string {
  const parsed = safeParse(isoDateTime);
  return parsed ? format(parsed, `${dateToken()} ${timeToken()}`) : FALLBACK;
}

const WEEKDAY_SHORT_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export function formatWeekdayShort(isoDate: string | null | undefined): string {
  const parsed = safeParse(isoDate);
  return parsed ? WEEKDAY_SHORT_RU[parsed.getDay()] : FALLBACK;
}
