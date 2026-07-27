import type { Employee } from "../types";

export interface CompositionKpis {
  totalEmployees: number;
  activeOnShift: number;
  activeOnShiftPercent: number;
  freeSpecialists: number;
  averageCompleteness: number;
}

export function computeCompositionKpis(employees: Employee[], averageCompleteness: number): CompositionKpis {
  const brigaded = employees.filter((e) => e.brigadeId !== null);
  const totalEmployees = brigaded.length;
  const activeOnShift = brigaded.filter((e) => e.status === "on_shift" || e.status === "on_site").length;
  const freeSpecialists = employees.filter((e) => e.brigadeId === null).length;
  return {
    totalEmployees,
    activeOnShift,
    activeOnShiftPercent: totalEmployees > 0 ? Math.round((activeOnShift / totalEmployees) * 100) : 0,
    freeSpecialists,
    averageCompleteness,
  };
}
