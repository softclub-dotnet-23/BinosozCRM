import { useMemo, useState, type FormEvent } from "react";
import {
  CalendarDays,
  Download,
  Eye,
  Grid2X2,
  MoreVertical,
  Pencil,
  Plus,
  Search,
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
import { Modal } from "../components/ui/Modal";
import { useAuth } from "../context/AuthContext";
import { useRepositoryState } from "../hooks/useRepositoryState";
import { usePersistentState } from "../hooks/usePersistentState";
import { usersRepository } from "../data/repositories";
import { ROLE_LABEL } from "../lib/auth/roleAccess";
import { resolvePersonPhoto } from "../utils/personPhotos";
import type { UserAccount, UserAccountStatus, UserRole } from "../types";
import "../styles/users.css";

type UserTab = "all" | "active" | "inactive";

const ROLE_CLASS_NAME: Record<UserRole, string> = {
  owner: "role-owner",
  administrator: "role-admin",
  prorab: "role-prorab",
  brigadir: "role-brigadir",
  storekeeper: "role-supply",
  accountant: "role-accountant",
};

const ROLE_OPTIONS = (Object.keys(ROLE_LABEL) as UserRole[]).map((value) => ({ value, label: ROLE_LABEL[value] }));

const EMPTY_FORM: Omit<UserAccount, "id" | "registeredAt"> = {
  fullName: "",
  login: "",
  role: "brigadir",
  phone: "",
  email: "",
  status: "active",
};

const TAJIK_PHONE_RE = /^\+992 \d{2} \d{3} ?\d{2} ?\d{2}$|^\+992 9\d{2} \d{2} \d{2} \d{2}$/;

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useRepositoryState(usersRepository);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<UserTab>("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistentState("users.page.size.v1", 10);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<UserAccount | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      if (tab === "active" && user.status !== "active") return false;
      if (tab === "inactive" && user.status === "active") return false;
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (statusFilter !== "all" && user.status !== statusFilter) return false;
      if (dateFrom && user.registeredAt < dateFrom) return false;
      if (dateTo && user.registeredAt > dateTo) return false;
      if (query && !`${user.fullName} ${user.login} ${user.email} ${user.phone}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [users, search, tab, roleFilter, statusFilter, dateFrom, dateTo]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const visibleUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  const stats = useMemo(() => {
    const active = users.filter((u) => u.status === "active").length;
    const inactive = users.filter((u) => u.status !== "active").length;
    const administrators = users.filter((u) => u.role === "administrator" || u.role === "owner").length;
    return { total: users.length, active, inactive, administrators, roleCount: ROLE_OPTIONS.length };
  }, [users]);

  const roleDistribution = useMemo(() => {
    const total = users.length || 1;
    return ROLE_OPTIONS.map(({ value, label }) => {
      const count = users.filter((u) => u.role === value).length;
      return { role: value, label, count, percent: (count / total) * 100 };
    }).filter((entry) => entry.count > 0);
  }, [users]);

  function resetFilters() {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  function openAdd() {
    setSelected(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModalMode("add");
  }

  function openUser(user: UserAccount, mode: "view" | "edit") {
    setSelected(user);
    setForm({ fullName: user.fullName, login: user.login, role: user.role, phone: user.phone, email: user.email, status: user.status });
    setFormError("");
    setModalMode(mode);
  }

  function submitUser(event: FormEvent) {
    event.preventDefault();
    if (!form.fullName.trim() || !form.login.trim() || !form.email.trim()) {
      setFormError("Заполните имя, логин и email");
      return;
    }
    if (form.phone.trim() && !TAJIK_PHONE_RE.test(form.phone.trim())) {
      setFormError("Формат телефона: +992 XX XXX XX XX");
      return;
    }
    const normalizedLogin = form.login.trim().toLowerCase();
    const loginTaken = users.some(
      (user) => user.login.toLowerCase() === normalizedLogin && user.id !== selected?.id,
    );
    if (loginTaken) {
      setFormError("Этот логин уже занят другим пользователем");
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
    const rows = filteredUsers.map((user) => [user.fullName, ROLE_LABEL[user.role], user.phone, user.email, user.status]);
    const csv = [["Пользователь", "Роль", "Телефон", "Email", "Статус"], ...rows]
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
    <AppLayout title="Пользователи" subtitle="Управление учетными записями и правами доступа" search={{ value: search, onChange: (value) => { setSearch(value); setPage(1); }, placeholder: "Поиск по пользователям..." }}>
      <div className="users-page">
        <div className="users-overview-row">
          <div className="users-kpi-grid">
            <UserKpi icon={UserRound} tone="green" label="Всего пользователей" value={String(stats.total)} suffix="учётных записей" />
            <UserKpi icon={UserCheck} tone="blue" label="Активные" value={String(stats.active)} suffix="пользователя" />
            <UserKpi icon={UserX} tone="orange" label="Неактивные" value={String(stats.inactive)} suffix="пользователя" />
            <UserKpi icon={ShieldCheck} tone="purple" label="Администраторы" value={String(stats.administrators)} suffix="пользователя" />
            <UserKpi icon={Grid2X2} tone="yellow" label="Роли" value={String(stats.roleCount)} suffix="ролей в системе" />
          </div>
          <div className="users-top-actions">
            <Button onClick={openAdd}><Plus size={15} /> Добавить пользователя</Button>
            <Button variant="secondary" onClick={exportCsv}><Download size={15} /> Экспорт</Button>
          </div>
        </div>

        <div className="users-content-grid">
          <Card className="users-table-card">
            <div className="users-tabs">
              {([['all', 'Все пользователи'], ['active', 'Активные'], ['inactive', 'Неактивные']] as [UserTab, string][]).map(([key, label]) => (
                <button key={key} type="button" className={tab === key ? "active" : ""} onClick={() => { setTab(key); setPage(1); }}>{label}</button>
              ))}
            </div>
            <div className="users-table-scroll">
              <table>
                <thead><tr><th><input type="checkbox" aria-label="Выбрать всех" /></th><th>Пользователь</th><th>Роль</th><th>Телефон</th><th>Email</th><th>Статус</th><th>Дата регистрации</th><th>Действия</th></tr></thead>
                <tbody>
                  {visibleUsers.map((user) => (
                    <tr key={user.id}>
                      <td><input type="checkbox" aria-label={`Выбрать ${user.fullName}`} /></td>
                      <td><div className="users-person"><UserAvatar user={user} /><div><strong>{user.fullName}</strong><span>@{user.login}</span></div></div></td>
                      <td><span className={`user-role ${ROLE_CLASS_NAME[user.role]}`}>{ROLE_LABEL[user.role]}</span></td>
                      <td className="nowrap">{user.phone}</td>
                      <td>{user.email}</td>
                      <td><span className={`user-status ${user.status === "active" ? "active" : "inactive"}`}>{user.status === "active" ? "Активен" : user.status === "blocked" ? "Заблокирован" : "Неактивен"}</span></td>
                      <td className="nowrap">{user.registeredAt}</td>
                      <td>
                        <div className="user-row-actions">
                          <button type="button" aria-label="Просмотреть" onClick={() => openUser(user, "view")}><Eye size={14} /></button>
                          <button type="button" aria-label="Редактировать" onClick={() => openUser(user, "edit")}><Pencil size={14} /></button>
                          <button
                            type="button"
                            aria-label="Изменить статус"
                            title={user.id === currentUser?.id ? "Нельзя изменить статус своей учётной записи" : "Изменить статус"}
                            disabled={user.id === currentUser?.id}
                            onClick={() => toggleStatus(user)}
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

          <aside className="users-aside">
            <Card className="users-filter-card">
              <h2>Фильтры</h2>
              <FilterLabel label="Поиск"><div className="users-filter-search"><Search size={13} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Имя, email или телефон..." /></div></FilterLabel>
              <FilterLabel label="Роль"><CustomSelect size="sm" fullWidth value={roleFilter} onValueChange={(value) => { setRoleFilter(value); setPage(1); }} options={[{ value: "all", label: "Все роли" }, ...ROLE_OPTIONS]} /></FilterLabel>
              <FilterLabel label="Статус"><CustomSelect size="sm" fullWidth value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }} options={[{ value: "all", label: "Все статусы" }, { value: "active", label: "Активные" }, { value: "inactive", label: "Неактивные" }, { value: "blocked", label: "Заблокированные" }]} /></FilterLabel>
              <FilterLabel label="Дата регистрации"><div className="users-date-range"><CalendarDays size={13} /><input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /><span>–</span><input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></div></FilterLabel>
              <div className="users-filter-actions"><Button size="sm" onClick={() => setPage(1)}>Применить</Button><Button size="sm" variant="secondary" onClick={resetFilters}>Сбросить</Button></div>
            </Card>

            <Card className="users-role-card">
              <h2>Пользователей по ролям</h2>
              <div className="users-role-content">
                <div className="users-role-donut" aria-label="Распределение пользователей по ролям" />
                <ul>
                  {roleDistribution.map((entry) => (
                    <li key={entry.role}><i className={ROLE_CLASS_NAME[entry.role]} />{entry.label} <b>{entry.count} ({entry.percent.toFixed(1)}%)</b></li>
                  ))}
                </ul>
              </div>
            </Card>
          </aside>
        </div>
      </div>

      <UserModal mode={modalMode} selected={selected} form={form} error={formError} setForm={setForm} onSubmit={submitUser} onClose={() => setModalMode(null)} />
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

function FilterLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="users-filter-label"><span>{label}</span>{children}</label>;
}

function UserModal({ mode, selected, form, error, setForm, onSubmit, onClose }: { mode: "add" | "edit" | "view" | null; selected: UserAccount | null; form: typeof EMPTY_FORM; error: string; setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>; onSubmit: (event: FormEvent) => void; onClose: () => void }) {
  const readOnly = mode === "view";
  return <Modal open={mode !== null} onClose={onClose} title={mode === "add" ? "Добавить пользователя" : mode === "edit" ? "Редактировать пользователя" : "Профиль пользователя"} description={selected ? `@${selected.login}` : "Создайте новую учётную запись"} size="md">
    <form className="users-modal-form" onSubmit={onSubmit}>
      <label><span>ФИО</span><input readOnly={readOnly} value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} placeholder="Имя и фамилия" /></label>
      <label><span>Логин</span><input readOnly={readOnly} value={form.login} onChange={(event) => setForm((current) => ({ ...current, login: event.target.value }))} placeholder="username" /></label>
      <label><span>Email</span><input readOnly={readOnly} type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="name@binosoz.tj" /></label>
      <label><span>Телефон</span><input readOnly={readOnly} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="+992 00 000 00 00" /></label>
      <label><span>Роль</span><CustomSelect fullWidth value={form.role} onValueChange={(value) => setForm((current) => ({ ...current, role: value as UserRole }))} disabled={readOnly} options={ROLE_OPTIONS} /></label>
      <label><span>Статус</span><CustomSelect fullWidth value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value as UserAccountStatus }))} disabled={readOnly} options={[{ value: "active", label: "Активен" }, { value: "inactive", label: "Неактивен" }, { value: "blocked", label: "Заблокирован" }]} /></label>
      {error && <p className="users-modal-error" role="alert">{error}</p>}
      <div className="users-modal-actions"><Button type="button" variant="secondary" onClick={onClose}>{readOnly ? "Закрыть" : "Отмена"}</Button>{!readOnly && <Button type="submit">{mode === "add" ? "Добавить" : "Сохранить"}</Button>}</div>
    </form>
  </Modal>;
}
