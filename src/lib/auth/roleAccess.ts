import type { UserRole } from "../../types";

/** Landing route right after login, and where a role gets bounced back to if it opens a route it can't use. */
export const ROLE_HOME: Record<UserRole, string> = {
  owner: "/dashboard",
  administrator: "/dashboard",
  accountant: "/payroll",
  prorab: "/works",
  brigadir: "/brigades",
  worker: "/worker/dashboard",
  storekeeper: "/inventory/materials",
};

const FULL_ACCESS = "*" as const;

/**
 * Routes each role may open. An entry ending in "/*" allows that path and every
 * path nested under it (e.g. Prorab's "/brigades/*" also covers
 * "/brigades/composition" and "/brigades/assignments" — real management tools a
 * Prorab needs). A plain entry (no "/*") matches that exact path ONLY, so a
 * role like Brigadir can be given its own "/brigades" (their scoped crew view)
 * without also inheriting the Prorab/Admin-only composition and assignment
 * management pages that happen to live one level deeper under the same prefix.
 *
 * Owner/administrator get everything (matches this app's current single-tenant
 * behavior — nothing was restricted before accounts existed). Other roles get a
 * generous slice around their actual job: e.g. a prorab runs works/brigades/
 * attendance on their object and needs to see stock, but has no reason to be in
 * Payroll approvals, brigade/inventory *management* actions, or the
 * Users/Settings admin pages.
 */
const ROLE_ALLOWED_PREFIXES: Record<UserRole, string[] | typeof FULL_ACCESS> = {
  owner: FULL_ACCESS,
  administrator: FULL_ACCESS,
  accountant: [
    "/dashboard", "/payroll", "/payroll-entries", "/payroll-advances", "/absences", "/reports", "/budgets", "/estimates", "/objects",
  ],
  // NOTE: /payroll-advances (PayrollAdvancesController) is class-level
  // [Authorize(Roles="Owner,Accountant")] — Prorab and Brigadir are both excluded here, live-
  // verified via curl (both get a real 403), even though the GET method also carries a
  // "...,Brigadir" override that looks like it should admit Brigadir. It doesn't: ASP.NET Core
  // combines multiple [Authorize] attributes on one action with AND, not "most specific wins", so
  // Brigadir still fails the class-level check. Do not re-add either role without re-verifying live.
  prorab: [
    "/dashboard", "/objects", "/works", "/individual-tasks", "/timesheets", "/brigades/*", "/attendance", "/inventory/*", "/reports",
    "/material-requests", "/material-consumption-reports", "/material-deliveries", "/absences", "/payroll",
  ],
  brigadir: [
    "/dashboard", "/works", "/individual-tasks", "/timesheets", "/brigades", "/attendance", "/inventory/materials", "/reports", "/payroll", "/profile",
    "/material-requests", "/material-consumption-reports", "/payroll-entries", "/work-orders",
  ],
  worker: ["/worker/*"],
  storekeeper: ["/dashboard", "/inventory/*", "/reports"],
};

export const ROLE_LABEL: Record<UserRole, string> = {
  owner: "Владелец",
  administrator: "Администратор",
  accountant: "Бухгалтер",
  prorab: "Прораб",
  brigadir: "Бригадир",
  worker: "Работник",
  storekeeper: "Снабженец",
};

export function isRouteAllowed(role: UserRole, pathname: string): boolean {
  const rule = ROLE_ALLOWED_PREFIXES[role];
  if (rule === FULL_ACCESS) return true;
  return rule.some((entry) => {
    if (entry.endsWith("/*")) {
      const base = entry.slice(0, -2);
      return pathname === base || pathname.startsWith(`${base}/`);
    }
    return pathname === entry;
  });
}
