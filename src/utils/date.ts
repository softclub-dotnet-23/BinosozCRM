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

/** "Сегодня"/"Вчера, HH:mm"-style relative label for a real ISO datetime, falling back to a plain
 * short date beyond that — shared by any worker page that shows a real recent-activity feed
 * (Фотоотчёт's comments, Профиль's activity card) so the two don't hand-roll the same day math. */
export function formatRelativeDay(isoDateTime: string, todayIso: string, todayLabel: string, yesterdayLabel: string, includeTime = true): string {
  const day = isoDateTime.slice(0, 10);
  const [y, m, d] = todayIso.split("-").map(Number);
  const yesterdayIso = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
  const time = includeTime ? `, ${formatDateTimeShort(isoDateTime).split(" ").slice(1).join(" ")}` : "";
  if (day === todayIso) return `${todayLabel}${time}`;
  if (day === yesterdayIso) return `${yesterdayLabel}${time}`;
  return formatDateShort(day);
}

const MONTH_GENITIVE_RU = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

/** Just the date half of formatRelativeDay's label (Сегодня/Вчера/"16 июля", no year, no time) —
 * for two-line date-over-time layouts like the Notifications row, where the time renders in its
 * own line via formatTimeOnly instead of being appended inline. */
export function formatRelativeDayLabel(isoDateTime: string, todayIso: string, todayLabel: string, yesterdayLabel: string): string {
  const day = isoDateTime.slice(0, 10);
  const [y, m, d] = todayIso.split("-").map(Number);
  const yesterdayIso = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
  if (day === todayIso) return todayLabel;
  if (day === yesterdayIso) return yesterdayLabel;
  const parsed = safeParse(day);
  return parsed ? `${parsed.getDate()} ${MONTH_GENITIVE_RU[parsed.getMonth()]}` : FALLBACK;
}

export function formatTimeOnly(isoDateTime: string | null | undefined): string {
  const parsed = safeParse(isoDateTime);
  return parsed ? format(parsed, timeToken()) : FALLBACK;
}
