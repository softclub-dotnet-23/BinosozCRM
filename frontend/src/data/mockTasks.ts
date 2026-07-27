import type { UpcomingTask } from "../types";

export const mockUpcomingTasks: UpcomingTask[] = [
  {
    id: "task-1",
    title: "Заливка плиты перекрытия секция 2",
    responsible: "Ф. Рахмонов",
    date: "2026-07-03",
    urgency: "overdue",
    objectId: "obj-1",
  },
  {
    id: "task-2",
    title: "Кладка стен 5 этажа",
    responsible: "Б. Курбонов",
    date: "2026-07-06",
    urgency: "today",
    objectId: "obj-6",
  },
  {
    id: "task-3",
    title: "Монтаж оконных блоков",
    responsible: "А. Юсупов",
    date: "2026-07-08",
    urgency: "planned",
    objectId: "obj-4",
  },
  {
    id: "task-4",
    title: "Электромонтажные работы",
    responsible: "К. Саидов",
    date: "2026-07-10",
    urgency: "planned",
    objectId: "obj-2",
  },
  {
    id: "task-5",
    title: "Поставка лифтового оборудования",
    responsible: "Ш. Давлатов",
    date: "2026-07-12",
    urgency: "planned",
    objectId: "obj-3",
  },
];
