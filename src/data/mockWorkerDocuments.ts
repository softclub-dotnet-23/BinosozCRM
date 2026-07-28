import type { WorkerDocument } from "../types";

/** Documents for obj-1 (Жилой комплекс «Сомони») — the object Рустам Саидов's brigade (Бригада №1)
 * is assigned to. Real, stable filenames rather than placeholders; there is no binary-file storage
 * anywhere in this app, so "opening" a document produces a real downloaded manifest of its own
 * metadata (see downloadWorkerDocument in utils/workerAnalytics.ts) rather than a dead link. */
export const mockWorkerDocuments: WorkerDocument[] = [
  { id: "doc-1", objectId: "obj-1", title: "План работ", fileName: "План работ Июль 2026.pdf", fileType: "pdf", sizeLabel: "1.2 МБ", uploadedDate: "2026-07-01" },
  { id: "doc-2", objectId: "obj-1", title: "Техника безопасности", fileName: "Техника безопасности Инструкция.pdf", fileType: "pdf", sizeLabel: "2.4 МБ", uploadedDate: "2026-06-15" },
  { id: "doc-3", objectId: "obj-1", title: "Смета материалов", fileName: "Смета материалов Секция A.xlsx", fileType: "spreadsheet", sizeLabel: "480 КБ", uploadedDate: "2026-07-05" },
  { id: "doc-4", objectId: "obj-1", title: "Чертежи", fileName: "Чертежи 1-2 этаж.dwg", fileType: "drawing", sizeLabel: "3.1 МБ", uploadedDate: "2026-06-20" },
];
