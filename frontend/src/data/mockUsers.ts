import type { UserAccount } from "../types";

/**
 * Seed accounts for the shared repository (persisted, no passwords — those live
 * separately in demoCredentials.ts and are never written to storage). One real
 * account per role so the login page's automatic role-redirect can be tested
 * end-to-end. Names reuse people who already have a headshot in personPhotos.ts
 * where possible, purely for a nicer demo — the login system itself doesn't
 * depend on that.
 */
export const mockUsers: UserAccount[] = [
  { id: "user-owner-1", login: "sadi.imomov", fullName: "Садди Имомов", role: "owner", status: "active", phone: "+992 93 123 45 67", email: "sadi.imomov@binosoz.tj", registeredAt: "2025-02-12" },
  { id: "user-admin-1", login: "admin", fullName: "Амир Холов", role: "administrator", status: "active", phone: "+992 93 987 65 43", email: "admin@binosoz.tj", registeredAt: "2025-03-04" },
  { id: "user-prorab-1", login: "firuz.rakhmonov", fullName: "Фируз Рахмонов", role: "prorab", status: "active", phone: "+992 90 456 78 90", email: "firuz.rakhmonov@binosoz.tj", registeredAt: "2025-04-18" },
  { id: "user-brigadir-1", login: "shakhrom.mirzoev", fullName: "Мирзоев Шахром", role: "brigadir", status: "active", phone: "+992 90 111 22 33", email: "shakhrom.mirzoev@binosoz.tj", registeredAt: "2025-05-02" },
  { id: "user-accountant-1", login: "mekhriniso.karimova", fullName: "Мехринисо Каримова", role: "accountant", status: "active", phone: "+992 93 222 33 11", email: "mekhriniso.karimova@binosoz.tj", registeredAt: "2025-10-15" },
  { id: "user-storekeeper-1", login: "said.khasanov", fullName: "Хасанов Саид", role: "storekeeper", status: "active", phone: "+992 93 444 55 66", email: "said.khasanov@binosoz.tj", registeredAt: "2025-08-09" },
  { id: "user-inactive-1", login: "inactive.demo", fullName: "Неактивный Демо", role: "brigadir", status: "inactive", phone: "+992 93 000 11 22", email: "inactive.demo@binosoz.tj", registeredAt: "2026-01-20" },
  { id: "user-blocked-1", login: "blocked.demo", fullName: "Заблокированный Демо", role: "prorab", status: "blocked", phone: "+992 93 000 33 44", email: "blocked.demo@binosoz.tj", registeredAt: "2026-02-14" },
];
