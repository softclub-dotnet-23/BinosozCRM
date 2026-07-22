import { usersRepository } from "../../data/repositories";
import { DEMO_CREDENTIALS } from "../../data/demoCredentials";
import type { SessionUser } from "../../types";

export interface AuthSuccess {
  ok: true;
  user: SessionUser;
}

export interface AuthFailure {
  ok: false;
  error: string;
}

export type AuthResult = AuthSuccess | AuthFailure;

const INVALID_CREDENTIALS_ERROR = "Неверный логин или пароль";

function toSessionUser(id: string, login: string, fullName: string, role: SessionUser["role"], employeeId: string | null): SessionUser {
  return { id, login, fullName, role, employeeId };
}

/**
 * Demo-mode authentication: checks the submitted password against
 * demoCredentials, then the account's status. Deliberately returns the exact
 * same generic error for "no such login" and "wrong password" so a caller
 * can never learn whether a login exists — status-specific messages only
 * appear once the password is already known to be correct, which is the
 * standard trade-off between that guarantee and giving a blocked/inactive
 * user an actionable message.
 *
 * `authenticate` is async (and has an artificial delay) so the UI exercises
 * a real loading state, and so this function's signature doesn't have to
 * change when a real backend call replaces the body later.
 */
export async function authenticate(loginInput: string, password: string): Promise<AuthResult> {
  await new Promise((resolve) => setTimeout(resolve, 450));

  const login = loginInput.trim().toLowerCase();
  const account = usersRepository.getSnapshot().find((u) => u.login.toLowerCase() === login);
  const expectedPassword = account ? DEMO_CREDENTIALS[account.login] : undefined;

  if (!account || expectedPassword === undefined || password !== expectedPassword) {
    return { ok: false, error: INVALID_CREDENTIALS_ERROR };
  }
  if (account.status === "inactive") {
    return { ok: false, error: "Учётная запись неактивна" };
  }
  if (account.status === "blocked") {
    return { ok: false, error: "Доступ к системе ограничен" };
  }

  return { ok: true, user: toSessionUser(account.id, account.login, account.fullName, account.role, account.employeeId) };
}
