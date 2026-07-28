import type { PhotoReport } from "../types";

/** One real seed entry (so "Фотоотчёт" isn't empty on first login) tied to work-1, brigade-1's
 * real completed work, using that work's own real imageUrl rather than a fabricated photo. Every
 * report after this one is worker-generated (see WorkerPhotoReportModal). */
export const mockPhotoReports: PhotoReport[] = [
  {
    id: "photo-1",
    employeeId: "employee-1",
    employeeName: "Рустам Саидов",
    workId: "work-1",
    workTitle: "Устройство фундамента",
    objectName: "Жилой комплекс «Сомони»",
    imageUrl: "/images/objects/residential-1.jpg",
    comment: "Фундамент залит, опалубка снята, поверхность подготовлена к гидроизоляции.",
    createdDate: "2026-07-18T16:20:00",
  },
];
