import type { PhotoReportComment } from "../types";

/** Real prorab review notes on specific real photo reports (see mockPhotoReports.ts) — the
 * review-side counterpart to the worker→prorab WorkerMessage channel, authored by the same real
 * prorab (Фируз Рахмонов, brigade-1's foreman) used throughout the worker pages. */
export const mockPhotoReportComments: PhotoReportComment[] = [
  {
    id: "prc-1",
    photoReportId: "photo-2",
    authorName: "Фируз Рахмонов",
    authorRole: "prorab",
    text: "Добавьте фото общего плана участка, не только крупный план.",
    createdDate: "2026-07-29T15:10:00",
  },
  {
    id: "prc-2",
    photoReportId: "photo-4",
    authorName: "Фируз Рахмонов",
    authorRole: "prorab",
    text: "Принято, работа выполнена качественно.",
    createdDate: "2026-07-28T18:00:00",
  },
  {
    id: "prc-3",
    photoReportId: "photo-7",
    authorName: "Фируз Рахмонов",
    authorRole: "prorab",
    text: "Нужно фото после исправления, ракурс не показывает весь участок.",
    createdDate: "2026-07-26T13:30:00",
  },
];
