import type { PhotoReport, PhotoReportStatus } from "../types";

/** Real brigade-1 works (see mockWorks.ts FEATURED_RAW) this worker actually has assignments on —
 * spans multiple real objects, matching mockAssignments.ts's own brigade-1-works-multiple-sites
 * model. Each template's image pool reuses real static assets already shipped under
 * public/images/ (thematically matched to the work itself) rather than inventing new URLs. */
interface WorkTemplate {
  workId: string;
  workTitle: string;
  objectName: string;
  sectionName: string;
  images: string[];
  comments: string[];
}

const TEMPLATES: WorkTemplate[] = [
  {
    workId: "work-1",
    workTitle: "Устройство фундамента",
    objectName: "Жилой комплекс «Сомони»",
    sectionName: "Подготовительные работы",
    images: ["/images/objects/residential-1.jpg", "/images/materials/cement-m400.jpg", "/images/materials/rebar-12mm.jpg", "/images/materials/gravel-20-40.jpg"],
    comments: [
      "Фундамент залит, опалубка снята, поверхность подготовлена к гидроизоляции.",
      "Заливка бетона М300 завершена, идёт набор прочности.",
      "Гидроизоляция фундамента выполнена, готово к обратной засыпке.",
    ],
  },
  {
    workId: "work-4",
    workTitle: "Арматура A500",
    objectName: "Жилой комплекс «Сомони»",
    sectionName: "Фундаменты",
    images: ["/images/materials/rebar-12mm.jpg", "/images/objects/residential-1.jpg"],
    comments: ["Армирование плиты по проекту, шаг арматуры проверен.", "Вязка каркаса завершена на участке 2, ожидает приёмки."],
  },
  {
    workId: "work-8",
    workTitle: "Штукатурка фасада",
    objectName: "Торговый центр «Дусти»",
    sectionName: "Отделочные работы",
    images: ["/images/materials/facade-paint.jpg", "/images/objects/mall-1.jpg"],
    comments: ["Штукатурка фасада, южная сторона, слой выровнен.", "Подготовка стен под окраску, грунтовка нанесена."],
  },
  {
    workId: "work-9",
    workTitle: "Монтаж колонн",
    objectName: "Автосервис «Форсаж»",
    sectionName: "Монтажные работы",
    images: ["/images/objects/service-1.jpg", "/images/materials/rebar-12mm.jpg", "/images/materials/timber-board.jpg"],
    comments: ["Монтаж колонн по оси А-Г завершён.", "Установка колонн, выверка вертикальности выполнена."],
  },
  {
    workId: "work-10",
    workTitle: "Прокладка электропроводки",
    objectName: "Жилой дом «Восток»",
    sectionName: "Инженерные сети",
    images: ["/images/materials/electrical-cable.jpg", "/images/objects/residential-2.jpg"],
    comments: ["Прокладка кабеля ВВГ по этажу завершена, маркировка выполнена.", "Установка подрозетников, ожидает проверки прорабом."],
  },
];

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

const TODAY = "2026-07-29";

// 24 reports total: recent days (23–29 июля) get a heavier, realistic upload cadence for the
// activity chart; earlier July dates fill out the rest of "this month". Status leans mostly
// approved (a healthy real site), with a handful still pending review and a few rejected —
// independently chosen, not copied from any reference numbers.
const PLAN: { daysAgo: number; templateIndex: number; imageCount: number; status: PhotoReportStatus; time: string }[] = [
  { daysAgo: 0, templateIndex: 0, imageCount: 4, status: "pending", time: "09:15" },
  { daysAgo: 0, templateIndex: 4, imageCount: 2, status: "pending", time: "14:40" },
  { daysAgo: 1, templateIndex: 2, imageCount: 2, status: "pending", time: "11:05" },
  { daysAgo: 1, templateIndex: 1, imageCount: 2, status: "approved", time: "16:20" },
  { daysAgo: 2, templateIndex: 3, imageCount: 3, status: "approved", time: "10:30" },
  { daysAgo: 2, templateIndex: 0, imageCount: 2, status: "approved", time: "15:50" },
  { daysAgo: 3, templateIndex: 4, imageCount: 2, status: "rejected", time: "12:10" },
  { daysAgo: 3, templateIndex: 2, imageCount: 2, status: "approved", time: "17:20" },
  { daysAgo: 4, templateIndex: 1, imageCount: 2, status: "approved", time: "09:40" },
  { daysAgo: 4, templateIndex: 3, imageCount: 3, status: "pending", time: "13:15" },
  { daysAgo: 5, templateIndex: 0, imageCount: 3, status: "approved", time: "08:55" },
  { daysAgo: 5, templateIndex: 4, imageCount: 2, status: "approved", time: "16:05" },
  { daysAgo: 6, templateIndex: 2, imageCount: 2, status: "approved", time: "11:30" },
  { daysAgo: 7, templateIndex: 1, imageCount: 2, status: "rejected", time: "10:00" },
  { daysAgo: 8, templateIndex: 3, imageCount: 2, status: "approved", time: "14:25" },
  { daysAgo: 9, templateIndex: 0, imageCount: 2, status: "approved", time: "09:10" },
  { daysAgo: 10, templateIndex: 4, imageCount: 2, status: "approved", time: "15:35" },
  { daysAgo: 11, templateIndex: 2, imageCount: 2, status: "approved", time: "12:45" },
  { daysAgo: 12, templateIndex: 1, imageCount: 2, status: "approved", time: "17:00" },
  { daysAgo: 14, templateIndex: 3, imageCount: 2, status: "approved", time: "10:20" },
  { daysAgo: 16, templateIndex: 0, imageCount: 3, status: "approved", time: "16:20" },
  { daysAgo: 18, templateIndex: 4, imageCount: 2, status: "rejected", time: "13:50" },
  { daysAgo: 20, templateIndex: 2, imageCount: 2, status: "approved", time: "09:25" },
  { daysAgo: 22, templateIndex: 1, imageCount: 2, status: "approved", time: "11:15" },
];

export const mockPhotoReports: PhotoReport[] = PLAN.map((p, i) => {
  const t = TEMPLATES[p.templateIndex];
  const date = addDays(TODAY, -p.daysAgo);
  const comment = t.comments[i % t.comments.length];
  const images = Array.from({ length: p.imageCount }, (_, k) => t.images[k % t.images.length]);
  return {
    id: `photo-${i + 1}`,
    employeeId: "employee-1",
    employeeName: "Рустам Саидов",
    workId: t.workId,
    workTitle: t.workTitle,
    objectName: t.objectName,
    sectionName: t.sectionName,
    images,
    comment,
    status: p.status,
    reviewerComment: p.status === "rejected" ? "Нужны фото после исправления, ракурс не показывает весь участок." : null,
    createdDate: `${date}T${p.time}:00`,
  };
});
