import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  Eye,
  KeyRound,
  Loader2,
  MoreVertical,
  Plus,
  ShieldCheck,
  UserCheck,
  UserRound,
} from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { CustomSelect } from "../components/ui/CustomSelect";
import { Modal } from "../components/ui/Modal";
import { useAuth } from "../context/AuthContext";
import { usePersistentState } from "../hooks/usePersistentState";
import { useToast } from "../hooks/useToast";
import { ApiError, NetworkError } from "../api/apiClient";
import { BACKEND_ROLES, mapToBackendRole, type BackendRole } from "../api/authApi";
import {
  activateUser,
  changeUserRole,
  createUser,
  deactivateUser,
  listUsers,
  resetUserPassword,
  type AppUser,
  type CreatedUser,
} from "../api/usersApi";
import { ROLE_LABEL } from "../lib/auth/roleAccess";
import { resolvePersonPhoto } from "../utils/personPhotos";
import type { UserRole } from "../types";
import "../styles/users.css";

const ROLE_CLASS_NAME: Partial<Record<UserRole, string>> = {
  owner: "role-owner",
  prorab: "role-prorab",
  brigadir: "role-brigadir",
  accountant: "role-accountant",
};

// Only the roles the backend can actually assign — administrator/storekeeper
// have no server-side equivalent (roleAccess.ts) and can never appear here.
const ROLE_OPTIONS = BACKEND_ROLES.map((backendRole) => {
  const role = mapToBackendRoleReverseLabel(backendRole);
  return { value: backendRole, label: ROLE_LABEL[role] };
});

function mapToBackendRoleReverseLabel(role: BackendRole): UserRole {
  switch (role) {
    case "Owner":
      return "owner";
    case "Prorab":
      return "prorab";
    case "Brigadir":
      return "brigadir";
    case "Accountant":
      return "accountant";
    case "Worker":
      return "worker";
  }
}

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) {
    switch (error.code) {
      case "PHONE_ALREADY_IN_USE":
        return "Пользователь с этим номером телефона уже существует";
      case "CANNOT_MODIFY_OWN_ACCOUNT":
        return "Нельзя изменить собственную учётную запись";
      case "USER_NOT_FOUND":
        return "Пользователь не найден";
      default:
        return error.message || fallback;
    }
  }
  return fallback;
}

function describeResetError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) {
    if (error.status === 401) return "Сессия истекла. Войдите в систему заново.";
    if (error.status === 403) return "У вас нет прав для этого действия.";
    if (error.code === "USER_NOT_FOUND") return "Пользователь не найден";
    return error.message || fallback;
  }
  return fallback;
}

const CREATE_FORM_INITIAL = { fullName: "", phone: "", role: "Brigadir" as BackendRole };

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistentState("users.page.size.v1", 10);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(CREATE_FORM_INITIAL);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const [viewUser, setViewUser] = useState<AppUser | null>(null);
  const [roleTarget, setRoleTarget] = useState<AppUser | null>(null);
  const [roleChangeValue, setRoleChangeValue] = useState<BackendRole>("Brigadir");
  const [roleChangeError, setRoleChangeError] = useState("");
  const [savingRole, setSavingRole] = useState(false);

  const [revealedPassword, setRevealedPassword] = useState<CreatedUser | null>(null);
  const [copyConfirmed, setCopyConfirmed] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const [resetTarget, setResetTarget] = useState<AppUser | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  async function loadUsers() {
    setLoadState("loading");
    try {
      // Users is a small, Owner-only administrative list (no server-side
      // search/filter endpoint exists) — one bulk fetch at the backend's own
      // page-size cap, filtered/paginated client-side, rather than a request
      // per keystroke or per filter change.
      const result = await listUsers(1, 100);
      setUsers(result.items);
      setLoadState("ready");
    } catch (error) {
      setLoadError(describeError(error, "Не удалось загрузить пользователей"));
      setLoadState("error");
    }
  }

  useEffect(() => {
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => !query || `${user.fullName} ${user.phone}`.toLowerCase().includes(query));
  }, [users, search]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const visibleUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  const stats = useMemo(() => {
    const active = users.filter((u) => u.isActive).length;
    const owners = users.filter((u) => u.role === "owner").length;
    return { total: users.length, active, owners };
  }, [users]);

  function openCreate() {
    setCreateForm(CREATE_FORM_INITIAL);
    setCreateError("");
    setCreateOpen(true);
  }

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    if (creating) return;
    if (!createForm.fullName.trim() || !createForm.phone.trim()) {
      setCreateError("Заполните имя и телефон");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const created = await createUser(createForm.fullName.trim(), createForm.phone.trim(), createForm.role);
      setUsers((current) => [created.user, ...current]);
      setCreateOpen(false);
      setCopyConfirmed(false);
      setRevealedPassword(created);
    } catch (error) {
      setCreateError(describeError(error, "Не удалось создать пользователя"));
    } finally {
      setCreating(false);
    }
  }

  function openRoleChange(user: AppUser) {
    setRoleTarget(user);
    setRoleChangeValue(mapToBackendRole(user.role));
    setRoleChangeError("");
  }

  async function submitRoleChange(event: FormEvent) {
    event.preventDefault();
    if (!roleTarget || savingRole) return;
    setSavingRole(true);
    setRoleChangeError("");
    try {
      const updated = await changeUserRole(roleTarget.id, roleChangeValue);
      setUsers((current) => current.map((u) => (u.id === updated.id ? updated : u)));
      setRoleTarget(null);
      showToast("Роль обновлена");
    } catch (error) {
      setRoleChangeError(describeError(error, "Не удалось изменить роль"));
    } finally {
      setSavingRole(false);
    }
  }

  async function toggleStatus(user: AppUser) {
    if (user.id === currentUser?.id || busyUserId) return;
    setBusyUserId(user.id);
    try {
      const updated = user.isActive ? await deactivateUser(user.id) : await activateUser(user.id);
      setUsers((current) => current.map((u) => (u.id === updated.id ? updated : u)));
      showToast(updated.isActive ? "Пользователь активирован" : "Пользователь деактивирован");
    } catch (error) {
      showToast(describeError(error, "Не удалось изменить статус"), "error");
    } finally {
      setBusyUserId(null);
    }
  }

  function openReset(user: AppUser) {
    setResetTarget(user);
    setResetNewPassword("");
    setResetConfirmPassword("");
    setResetError("");
  }

  function closeReset() {
    setResetTarget(null);
    setResetNewPassword("");
    setResetConfirmPassword("");
    setResetError("");
  }

  async function submitReset(event: FormEvent) {
    event.preventDefault();
    if (!resetTarget || resettingPassword) return;
    if (resetNewPassword.length < 8) {
      setResetError("Новый пароль должен содержать не менее 8 символов");
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError("Пароли не совпадают");
      return;
    }
    setResettingPassword(true);
    setResetError("");
    try {
      await resetUserPassword(resetTarget.id, resetNewPassword);
      showToast("Пароль сброшен");
      closeReset();
    } catch (error) {
      setResetError(describeResetError(error, "Не удалось сбросить пароль"));
    } finally {
      setResettingPassword(false);
    }
  }

  function exportCsv() {
    const rows = filteredUsers.map((user) => [user.fullName, ROLE_LABEL[user.role], user.phone, user.isActive ? "Активен" : "Неактивен"]);
    const csv = [["Пользователь", "Роль", "Телефон", "Статус"], ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "binosoz-users.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppLayout title="Пользователи" subtitle="Управление учётными записями и правами доступа" search={{ value: search, onChange: (value) => { setSearch(value); setPage(1); }, placeholder: "Поиск по пользователям..." }}>
      <div className="users-page">
        <div className="users-overview-row">
          <div className="users-kpi-grid">
            <UserKpi icon={UserRound} tone="green" label="Всего пользователей" value={String(stats.total)} suffix="учётных записей" />
            <UserKpi icon={UserCheck} tone="blue" label="Активные" value={String(stats.active)} suffix="пользователя" />
            <UserKpi icon={ShieldCheck} tone="purple" label="Владельцы" value={String(stats.owners)} suffix="учётных записей" />
          </div>
          <div className="users-top-actions">
            <Button onClick={openCreate}><Plus size={15} /> Добавить пользователя</Button>
            <Button variant="secondary" onClick={exportCsv} disabled={loadState !== "ready"}>Экспорт</Button>
          </div>
        </div>

        {loadState === "error" && (
          <Card className="users-table-card" style={{ padding: 24 }}>
            <div className="flex items-center gap-2 text-red"><AlertCircle size={18} /><span>{loadError}</span></div>
            <Button size="sm" variant="secondary" onClick={() => void loadUsers()} style={{ marginTop: 12 }}>Повторить</Button>
          </Card>
        )}

        {loadState === "loading" && (
          <Card className="users-table-card" style={{ padding: 40, textAlign: "center" }}>
            <Loader2 size={22} className="animate-spin" style={{ margin: "0 auto" }} />
          </Card>
        )}

        {loadState === "ready" && (
          <>
            <Card className="users-table-card">
              {filteredUsers.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "var(--color-ink-muted)" }}>Пользователи не найдены</div>
              ) : (
                <div className="users-table-scroll">
                  <table>
                    <thead><tr><th>Пользователь</th><th>Роль</th><th>Телефон</th><th>Статус</th><th>Действия</th></tr></thead>
                    <tbody>
                      {visibleUsers.map((user) => (
                        <tr key={user.id}>
                          <td><div className="users-person"><UserAvatar user={user} /><div><strong>{user.fullName}</strong>{user.forcePasswordChange && <span title="Ожидает смены пароля">· временный пароль</span>}</div></div></td>
                          <td><span className={`user-role ${ROLE_CLASS_NAME[user.role] ?? ""}`}>{ROLE_LABEL[user.role]}</span></td>
                          <td className="nowrap">{user.phone}</td>
                          <td><span className={`user-status ${user.isActive ? "active" : "inactive"}`}>{user.isActive ? "Активен" : "Неактивен"}</span></td>
                          <td>
                            <div className="user-row-actions">
                              <button type="button" aria-label="Просмотреть" onClick={() => setViewUser(user)}><Eye size={14} /></button>
                              <button
                                type="button"
                                aria-label="Изменить роль"
                                title={user.id === currentUser?.id ? "Нельзя изменить свою роль" : "Изменить роль"}
                                disabled={user.id === currentUser?.id}
                                onClick={() => openRoleChange(user)}
                              >
                                <ShieldCheck size={14} />
                              </button>
                              <button
                                type="button"
                                aria-label="Сбросить пароль"
                                title="Сбросить пароль"
                                onClick={() => openReset(user)}
                              >
                                <KeyRound size={14} />
                              </button>
                              <button
                                type="button"
                                aria-label="Изменить статус"
                                title={user.id === currentUser?.id ? "Нельзя изменить статус своей учётной записи" : "Изменить статус"}
                                disabled={user.id === currentUser?.id || busyUserId === user.id}
                                onClick={() => void toggleStatus(user)}
                              >
                                <MoreVertical size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="users-pagination">
                <span>Показано {visibleUsers.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filteredUsers.length)} из {filteredUsers.length} пользователей</span>
                <div><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button>{Array.from({ length: pageCount }, (_, index) => <button type="button" key={index} className={page === index + 1 ? "active" : ""} onClick={() => setPage(index + 1)}>{index + 1}</button>)}<button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>›</button></div>
                <label>
                  Показывать по:{" "}
                  <CustomSelect
                    size="sm"
                    value={String(pageSize)}
                    onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}
                    options={[{ value: "10", label: "10" }, { value: "25", label: "25" }, { value: "50", label: "50" }]}
                  />
                </label>
              </div>
            </Card>
          </>
        )}
      </div>

      <CreateUserModal
        open={createOpen}
        form={createForm}
        error={createError}
        submitting={creating}
        setForm={setCreateForm}
        onSubmit={submitCreate}
        onClose={() => setCreateOpen(false)}
      />

      <ViewUserModal user={viewUser} onClose={() => setViewUser(null)} />

      <RoleChangeModal
        user={roleTarget}
        value={roleChangeValue}
        error={roleChangeError}
        submitting={savingRole}
        onChange={setRoleChangeValue}
        onSubmit={submitRoleChange}
        onClose={() => setRoleTarget(null)}
      />

      <TemporaryPasswordModal
        result={revealedPassword}
        copyConfirmed={copyConfirmed}
        onCopy={() => setCopyConfirmed(true)}
        onClose={() => setRevealedPassword(null)}
      />

      <ResetPasswordModal
        user={resetTarget}
        newPassword={resetNewPassword}
        confirmPassword={resetConfirmPassword}
        error={resetError}
        submitting={resettingPassword}
        onNewPasswordChange={setResetNewPassword}
        onConfirmPasswordChange={setResetConfirmPassword}
        onSubmit={submitReset}
        onClose={closeReset}
      />
    </AppLayout>
  );
}

function UserKpi({ icon: Icon, tone, label, value, suffix }: { icon: typeof UserRound; tone: string; label: string; value: string; suffix: string }) {
  return <Card className="user-kpi"><span className={`user-kpi-icon ${tone}`}><Icon size={20} /></span><div><p>{label}</p><strong>{value}</strong><span>{suffix}</span></div></Card>;
}

function UserAvatar({ user }: { user: AppUser }) {
  const src = resolvePersonPhoto(user.fullName);
  return src ? (
    <img className="users-row-avatar" src={src} alt={user.fullName} loading="lazy" decoding="async" />
  ) : (
    <Avatar name={user.fullName} size="sm" />
  );
}

function CreateUserModal({
  open,
  form,
  error,
  submitting,
  setForm,
  onSubmit,
  onClose,
}: {
  open: boolean;
  form: typeof CREATE_FORM_INITIAL;
  error: string;
  submitting: boolean;
  setForm: React.Dispatch<React.SetStateAction<typeof CREATE_FORM_INITIAL>>;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Добавить пользователя" description="Пароль будет сгенерирован автоматически" size="md">
      <form className="users-modal-form" onSubmit={onSubmit}>
        <label><span>ФИО</span><input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} placeholder="Имя и фамилия" autoFocus /></label>
        <label><span>Телефон</span><input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="+992 00 000 00 00" autoComplete="tel" /></label>
        <label><span>Роль</span><CustomSelect fullWidth value={form.role} onValueChange={(value) => setForm((current) => ({ ...current, role: value as BackendRole }))} options={ROLE_OPTIONS} /></label>
        {error && <p className="users-modal-error" role="alert">{error}</p>}
        <div className="users-modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Создание..." : "Создать"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ViewUserModal({ user, onClose }: { user: AppUser | null; onClose: () => void }) {
  return (
    <Modal open={user !== null} onClose={onClose} title="Профиль пользователя" description={user?.phone} size="sm">
      {user && (
        <div className="users-modal-form">
          <label><span>ФИО</span><input readOnly value={user.fullName} /></label>
          <label><span>Телефон</span><input readOnly value={user.phone} /></label>
          <label><span>Роль</span><input readOnly value={ROLE_LABEL[user.role]} /></label>
          <label><span>Статус</span><input readOnly value={user.isActive ? "Активен" : "Неактивен"} /></label>
          <label><span>Смена пароля при входе</span><input readOnly value={user.forcePasswordChange ? "Требуется" : "Не требуется"} /></label>
          <div className="users-modal-actions"><Button type="button" variant="secondary" onClick={onClose}>Закрыть</Button></div>
        </div>
      )}
    </Modal>
  );
}

function RoleChangeModal({
  user,
  value,
  error,
  submitting,
  onChange,
  onSubmit,
  onClose,
}: {
  user: AppUser | null;
  value: BackendRole;
  error: string;
  submitting: boolean;
  onChange: (value: BackendRole) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <Modal open={user !== null} onClose={onClose} title="Изменить роль" description={user?.fullName} size="sm">
      <form className="users-modal-form" onSubmit={onSubmit}>
        <label><span>Новая роль</span><CustomSelect fullWidth value={value} onValueChange={(v) => onChange(v as BackendRole)} options={ROLE_OPTIONS} /></label>
        {error && <p className="users-modal-error" role="alert">{error}</p>}
        <div className="users-modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Сохранение..." : "Сохранить"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({
  user,
  newPassword,
  confirmPassword,
  error,
  submitting,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  onClose,
}: {
  user: AppUser | null;
  newPassword: string;
  confirmPassword: string;
  error: string;
  submitting: boolean;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <Modal open={user !== null} onClose={onClose} title="Сбросить пароль" description={user?.fullName} size="sm">
      <form className="users-modal-form" onSubmit={onSubmit}>
        <label>
          <span>Новый пароль</span>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => onNewPasswordChange(event.target.value)}
            autoComplete="new-password"
            aria-invalid={error ? true : undefined}
            autoFocus
          />
        </label>
        <label>
          <span>Повторите новый пароль</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => onConfirmPasswordChange(event.target.value)}
            autoComplete="new-password"
            aria-invalid={error ? true : undefined}
          />
        </label>
        {error && <p className="users-modal-error" role="alert">{error}</p>}
        <div className="users-modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Сохранение..." : "Сбросить"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function TemporaryPasswordModal({
  result,
  copyConfirmed,
  onCopy,
  onClose,
}: {
  result: CreatedUser | null;
  copyConfirmed: boolean;
  onCopy: () => void;
  onClose: () => void;
}) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(result?.temporaryPassword ?? "");
    } catch {
      // clipboard API unavailable — the password is still selectable/visible in the field below
    }
    onCopy();
  }

  return (
    <Modal
      open={result !== null}
      onClose={copyConfirmed ? onClose : () => {}}
      title="Временный пароль создан"
      description={result ? `${result.user.fullName} — ${result.user.phone}` : undefined}
      size="sm"
    >
      {result && (
        <div className="users-modal-form">
          <div className="flex items-start gap-2 rounded-[10px] bg-[#FFF4E5] p-3 text-sm text-ink-secondary">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>Пароль показывается только один раз. Передайте его пользователю сейчас — после закрытия этого окна увидеть его снова будет нельзя.</span>
          </div>
          <label>
            <span>Временный пароль</span>
            <div style={{ display: "flex", gap: 8 }}>
              <input readOnly value={result.temporaryPassword} style={{ fontFamily: "monospace", fontSize: 16, letterSpacing: 1 }} onFocus={(e) => e.target.select()} />
              <Button type="button" variant="secondary" onClick={() => void handleCopy()}><Copy size={14} /></Button>
            </div>
          </label>
          <label className="users-filter-search" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={copyConfirmed} onChange={onCopy} />
            <span>Я сохранил(а) или передал(а) пароль</span>
          </label>
          <div className="users-modal-actions">
            <Button type="button" disabled={!copyConfirmed} onClick={onClose}>
              {copyConfirmed ? <><Check size={14} /> Закрыть</> : "Закрыть"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
