export interface UpcomingBrigadeAssignment {
  id: string;
  dateLabel: string;
  date: string;
  brigadeName: string;
  objectName: string;
  specializationBadge: string;
}

export const mockUpcomingBrigadeAssignments: UpcomingBrigadeAssignment[] = [
  {
    id: "uba-1",
    dateLabel: "Завтра, 01.08.2026",
    date: "2026-08-01",
    brigadeName: "Бригада №2",
    objectName: "ЖК «Сомони»",
    specializationBadge: "Кладочные работы",
  },
  {
    id: "uba-2",
    dateLabel: "02.08.2026",
    date: "2026-08-02",
    brigadeName: "Бригада №3",
    objectName: "Коттедж «Навруз»",
    specializationBadge: "Отделочные работы",
  },
  {
    id: "uba-3",
    dateLabel: "05.08.2026",
    date: "2026-08-05",
    brigadeName: "Бригада №7",
    objectName: "Торговый центр «Дусти»",
    specializationBadge: "Столярные работы",
  },
];
