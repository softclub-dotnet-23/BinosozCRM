import { useMemo, useState, type FormEvent } from "react";
import {
  Download,
  Eye,
  Grid2X2,
  MoreVertical,
  Pencil,
  Plus,
  Power,
  ShieldCheck,
  UserCheck,
  UserRound,
  UserX,
} from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { CustomSelect } from "../components/ui/CustomSelect";
import { DropdownMenu } from "../components/ui/DropdownMenu";
import { Modal } from "../components/ui/Modal";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useRepositoryState } from "../hooks/useRepositoryState";
import { usePersistentState } from "../hooks/usePersistentState";
import { usersRepository } from "../data/repositories";
import { resolvePersonPhoto } from "../utils/personPhotos";
import type { AppStrings } from "../lib/i18n/appStrings";
import type { UserAccount, UserAccountStatus, UserRole } from "../types";
import "../styles/users.css";

type UserTab = "all" | "active" | "inactive";
type UsersStrings = AppStrings["users"];

const ROLE_CLASS_NAME: Record<UserRole, string> = {
  owner: "role-owner",
  administrator: "role-admin",
  prorab: "role-prorab",
  brigadir: "role-brigadir",
  worker: "role-worker",
  storekeeper: "role-supply",
  accountant: "role-accountant",
};

const ROLE_KEYS = Object.keys(ROLE_CLASS_NAME) as UserRole[];

const EMPTY_FORM: Omit<UserAccount, "id" | "registeredAt"> = {
  fullName: "",
  login: "",
  role: "brigadir",
  phone: "",
  email: "",
  status: "active",
  employeeId: null,
};

const TAJIK_PHONE_RE = /^\+992 \d{2} \d{3} ?\d{2} ?\d{2}$|^\+992 9\d{2} \d{2} \d{2} \d{2}$/;

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { strings } = useLanguage();
  const s = strings.users;
  const { roleLabels } = strings.common;
  const [users, setUsers] = useRepositoryState(usersRepository);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<UserTab>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistentState("users.page.size.v1", 10);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<UserAccount | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const roleOptions = useMemo(() => ROLE_KEYS.map((value) => ({ value, label: roleLabels[value] })), [roleLabels]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      if (tab === "active" && user.status !== "active") return false;
      if (tab === "inactive" && user.status === "active") return false;
      if (query && !`${user.fullName} ${user.login} ${user.email} ${user.phone}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [users, search, tab]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const visibleUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  const stats = useMemo(() => {
    const active = users.filter((u) => u.status === "active").length;
    const inactive = users.filter((u) => u.status !== "active").length;
    const administrators = users.filter((u) => u.role === "administrator" || u.role === "owner").length;
    return { total: users.length, active, inactive, administrators, roleCount: roleOptions.length };
  }, [users, roleOptions]);

  function openAdd() {
    setSelected(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModalMode("add");
  }

  function openUser(user: UserAccount, mode: "view" | "edit") {
    setSelected(user);
    setForm({ fullName: user.fullName, login: user.login, role: user.role, phone: user.phone, email: user.email, status: user.status, employeeId: user.employeeId });
    setFormError("");
    setModalMode(mode);
  }

  function submitUser(event: FormEvent) {
    event.preventDefault();
    if (!form.fullName.trim() || !form.login.trim() || !form.email.trim()) {
      setFormError(s.errorRequiredFields);
      return;
    }
    if (form.phone.trim() && !TAJIK_PHONE_RE.test(form.phone.trim())) {
      setFormError(s.errorPhoneFormat);
      return;
    }
    const normalizedLogin = form.login.trim().toLowerCase();
    const loginTaken = users.some(
      (user) => user.login.toLowerCase() === normalizedLogin && user.id !== selected?.id,
    );
    if (loginTaken) {
      setFormError(s.errorLoginTaken);
      return;
    }
    if (modalMode === "edit" && selected) {
      setUsers((current) => current.map((user) => (user.id === selected.id ? { ...user, ...form, login: normalizedLogin } : user)));
    } else {
      setUsers((current) => [
        { ...form, login: normalizedLogin, id: `user-${Date.now()}`, registeredAt: new Date().toISOString().slice(0, 10) },
        ...current,
      ]);
    }
    setModalMode(null);
  }

  function toggleStatus(user: UserAccount) {
    if (user.id === currentUser?.id) return;
    setUsers((current) => current.map((row) => (row.id === user.id ? { ...row, status: row.status === "active" ? "inactive" : "active" } : row)));
  }

  function exportCsv() {
    const rows = filteredUsers.map((user) => [user.fullName, roleLabels[user.role], user.phone, user.email, user.status]);
    const csv = [[s.csvUser, s.csvRole, s.csvPhone, s.csvEmail, s.csvStatus], ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "binosoz-users.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function statusLabel(status: UserAccountStatus): string {
    if (status === "active") return s.statusActive;
    if (status === "blocked") return s.statusBlocked;
    return s.statusInactive;
  }

  return (
    <AppLayout title={s.pageTitle} subtitle={s.pageSubtitle} search={{ value: search, onChange: (value) => { setSearch(value); setPage(1); }, placeholder: s.searchPlaceholder }}>
      <div className="users-page">
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-warning bg-warning-soft p-4 text-sm text-ink">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-warning" />
          <div>
            <p className="font-semibold text-warning">Модуль управления пользователями недоступен на бэкенде</p>
            <p className="mt-0.5 text-ink-secondary">
              Backend поддерживает только вход в систему и профиль текущего пользователя (GET /users/me не
              реализован). Список, создание, редактирование и удаление пользователей ниже — демонстрационные
              данные, не связанные с реальным сервером. Действия не будут сохранены.
            </p>
          </div>
        </div>
        <div className="users-overview-row">
          <div className="users-kpi-grid">
            <UserKpi icon={UserRound} tone="green" label={s.kpiTotal} value={String(stats.total)} suffix={s.kpiTotalSuffix} />
            <UserKpi icon={UserCheck} tone="blue" label={s.kpiActive} value={String(stats.active)} suffix={s.kpiActiveSuffix} />
            <UserKpi icon={UserX} tone="orange" label={s.kpiInactive} value={String(stats.inactive)} suffix={s.kpiInactiveSuffix} />
            <UserKpi icon={ShieldCheck} tone="purple" label={s.kpiAdmins} value={String(stats.administrators)} suffix={s.kpiAdminsSuffix} />
            <UserKpi icon={Grid2X2} tone="yellow" label={s.kpiRoles} value={String(stats.roleCount)} suffix={s.kpiRolesSuffix} />
          </div>
          <div className="users-top-actions">
            <Button onClick={openAdd}><Plus size={15} /> {s.addUser}</Button>
            <Button variant="secondary" onClick={exportCsv}><Download size={15} /> {s.export}</Button>
          </div>
        </div>

        <div className="users-content-grid">
          <Card className="users-table-card">
            <div className="users-tabs">
              {([['all', s.tabAll], ['active', s.tabActive], ['inactive', s.tabInactive]] as [UserTab, string][]).map(([key, label]) => (
                <button key={key} type="button" className={tab === key ? "active" : ""} onClick={() => { setTab(key); setPage(1); }}>{label}</button>
              ))}
            </div>
            <div className="users-table-scroll">
              <table>
                <thead><tr><th><input type="checkbox" aria-label={s.colSelectAll} /></th><th>{s.colUser}</th><th>{s.colRole}</th><th>{s.colPhone}</th><th>{s.colEmail}</th><th>{s.colStatus}</th><th>{s.colRegisteredAt}</th><th>{s.colActions}</th></tr></thead>
                <tbody>
                  {visibleUsers.map((user) => (
                    <tr key={user.id}>
                      <td><input type="checkbox" aria-label={s.selectUser(user.fullName)} /></td>
                      <td><div className="users-person"><UserAvatar user={user} /><div><strong>{user.fullName}</strong><span>@{user.login}</span></div></div></td>
                      <td><span className={`user-role ${ROLE_CLASS_NAME[user.role]}`}>{roleLabels[user.role]}</span></td>
                      <td className="nowrap">{user.phone}</td>
                      <td>{user.email}</td>
                      <td><span className={`user-status ${user.status === "active" ? "active" : "inactive"}`}>{statusLabel(user.status)}</span></td>
                      <td className="nowrap">{user.registeredAt}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end">
                          <DropdownMenu
                            trigger={<MoreVertical size={16} />}
                            items={[
                              { label: s.actionView, icon: <Eye size={14} />, onClick: () => openUser(user, "view") },
                              { label: s.actionEdit, icon: <Pencil size={14} />, onClick: () => openUser(user, "edit") },
                              {
                                label: user.id === currentUser?.id ? s.actionChangeStatusDisabled : s.actionChangeStatus,
                                icon: <Power size={14} />,
                                onClick: () => toggleStatus(user),
                                disabled: user.id === currentUser?.id,
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="users-pagination">
              <span>{strings.common.paginationShown(visibleUsers.length ? (page - 1) * pageSize + 1 : 0, Math.min(page * pageSize, filteredUsers.length), filteredUsers.length, s.paginationItemLabel)}</span>
              <div><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button>{Array.from({ length: pageCount }, (_, index) => <button type="button" key={index} className={page === index + 1 ? "active" : ""} onClick={() => setPage(index + 1)}>{index + 1}</button>)}<button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>›</button></div>
              <label>
                {strings.common.showPerPage}{" "}
                <CustomSelect
                  size="sm"
                  value={String(pageSize)}
                  onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}
                  options={[{ value: "10", label: "10" }, { value: "25", label: "25" }, { value: "50", label: "50" }]}
                />
              </label>
            </div>
          </Card>
        </div>
      </div>

      <UserModal s={s} roleOptions={roleOptions} mode={modalMode} selected={selected} form={form} error={formError} setForm={setForm} onSubmit={submitUser} onClose={() => setModalMode(null)} />
    </AppLayout>
  );
}

function UserKpi({ icon: Icon, tone, label, value, suffix }: { icon: typeof UserRound; tone: string; label: string; value: string; suffix: string }) {
  return <Card className="user-kpi"><span className={`user-kpi-icon ${tone}`}><Icon size={20} /></span><div><p>{label}</p><strong>{value}</strong><span>{suffix}</span></div></Card>;
}

function UserAvatar({ user }: { user: UserAccount }) {
  const src = resolvePersonPhoto(user.fullName);
  return src ? <img className="users-row-avatar" src={src} alt={user.fullName} /> : <Avatar name={user.fullName} size="sm" />;
}

function UserModal({ s, roleOptions, mode, selected, form, error, setForm, onSubmit, onClose }: {
  s: UsersStrings;
  roleOptions: { value: UserRole; label: string }[];
  mode: "add" | "edit" | "view" | null;
  selected: UserAccount | null;
  form: typeof EMPTY_FORM;
  error: string;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}) {
  const readOnly = mode === "view";
  return <Modal open={mode !== null} onClose={onClose} title={mode === "add" ? s.modalAddTitle : mode === "edit" ? s.modalEditTitle : s.modalViewTitle} description={selected ? `@${selected.login}` : s.modalAddDescription} size="md">
    <form className="users-modal-form" onSubmit={onSubmit}>
      <label><span>{s.fieldFullName}</span><input readOnly={readOnly} value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} placeholder={s.fieldFullNamePlaceholder} /></label>
      <label><span>{s.fieldLogin}</span><input readOnly={readOnly} value={form.login} onChange={(event) => setForm((current) => ({ ...current, login: event.target.value }))} placeholder={s.fieldLoginPlaceholder} /></label>
      <label><span>{s.fieldEmail}</span><input readOnly={readOnly} type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder={s.fieldEmailPlaceholder} /></label>
      <label><span>{s.fieldPhone}</span><input readOnly={readOnly} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder={s.fieldPhonePlaceholder} /></label>
      <label><span>{s.fieldRole}</span><CustomSelect fullWidth value={form.role} onValueChange={(value) => setForm((current) => ({ ...current, role: value as UserRole }))} disabled={readOnly} options={roleOptions} /></label>
      <label><span>{s.fieldStatus}</span><CustomSelect fullWidth value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value as UserAccountStatus }))} disabled={readOnly} options={[{ value: "active", label: s.statusActive }, { value: "inactive", label: s.statusInactive }, { value: "blocked", label: s.statusBlocked }]} /></label>
      {error && <p className="users-modal-error" role="alert">{error}</p>}
      <div className="users-modal-actions"><Button type="button" variant="secondary" onClick={onClose}>{readOnly ? s.buttonClose : s.buttonCancel}</Button>{!readOnly && <Button type="submit">{mode === "add" ? s.buttonAdd : s.buttonSave}</Button>}</div>
    </form>
  </Modal>;
}
