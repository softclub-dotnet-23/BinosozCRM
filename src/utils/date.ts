import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

export function formatDateRu(isoDate: string): string {
  return format(parseISO(isoDate), "d MMM yyyy", { locale: ru }).replace(".", "");
}

export function formatDateShort(isoDate: string): string {
  return format(parseISO(isoDate), "dd.MM.yyyy");
}
