export interface WorkDynamicsPoint {
  date: string;
  label: string;
  planned: number;
  actual: number;
}

export const mockWorkDynamics: WorkDynamicsPoint[] = [
  { date: "2026-07-01", label: "1 июл", planned: 0, actual: 0 },
  { date: "2026-07-06", label: "6 июл", planned: 15, actual: 7 },
  { date: "2026-07-11", label: "11 июл", planned: 31, actual: 18 },
  { date: "2026-07-16", label: "16 июл", planned: 47, actual: 30 },
  { date: "2026-07-21", label: "21 июл", planned: 64, actual: 38 },
  { date: "2026-07-26", label: "26 июл", planned: 83, actual: 55 },
  { date: "2026-07-31", label: "31 июл", planned: 100, actual: 72 },
];
