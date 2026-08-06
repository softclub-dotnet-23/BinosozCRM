import { useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Copy,
  Download,
  Eye,
  Grid2X2,
  MoreVertical,
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
import { EmptyState } from "../components/ui/EmptyState";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { usePersistentState } from "../hooks/usePersistentState";
import { useBlockUser, useCreateUser, useUnblockUser, useUsers } from "../hooks/api/useUsers";
import { normalizeApiError } from "../services/apiError";
import { Role, type BackendRole } from "../services/types";
import type { UserDto } from "../services/usersApi";
import type { AppStrings } from "../lib/i18n/appStrings";
import type { UserRole } from "../types";
import "../styles/users.css";

type UserTab = "all" | "active" | "inactive";
type UsersStrings = AppStrings["users"];

// The frontend's UserRole string union mirrors Domain/Enums/Role.cs 1:1 (see services/types.ts's
// Role numeric enum) — this is the one place the numeric wire value needs to become the string
// key that roleLabels/ROLE_CLASS_NAME (both keyed by the app's own UserRole type) already use.
const NUMERIC_ROLE_TO_FRONTEND: Record<Role, UserRole> = {
  [Role.Owner]: "owner",
  [Role.Prorab]: "prorab",
  [Role.Brigadir]: "brigadir",
  [Role.Accountant]: "accountant",
};

const ROLE_CLASS_NAME: Record<UserRole, string> = {
  owner: "role-owner",
  prorab: "role-prorab",
  brigadir: "role-brigadir",
  accountant: "role-accountant",
};

const ROLE_KEYS = Object.keys(ROLE_CLASS_NAME) as UserRole[];

const TAJIK_PHONE_RE = /^\+992 \d{2} \d{3} ?\d{2} ?\d{2}$|^\+992 9\d{2} \d{2} \d{2} \d{2}$/;

// One page big enough to cover a construction company's real user count (a handful of Owners,
// Prorabs, Brigadirs, Accountants — not thousands) — lets the KPIs and the all/active/inactive
// tabs work off one real dataset instead of adding a second aggregate-only backend call.
const PAGE_SIZE = 200;

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { strings } = useLanguage();
  const s = strings.users;
  const { roleLabels } = strings.common;

  const { data, isLoading, isError, error, refetch } = useUsers({ page: 1, pageSize: PAGE_SIZE });
  const createMutation = useCreateUser();
  const blockMutation = useBlockUser();
  const unblockMutation = useUnblockUser();

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<UserTab>("all");
  const [tablePage, setTablePage] = useState(1);
  const [pageSize, setPageSize] = usePersistentState("users.page.size.v1", 10);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<UserDto | null>(null);
  const [justCreated, setJustCreated] = useState<{ user: UserDto; temporaryPassword: string } | null>(null);

  const users = data?.items ?? [];

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      if (tab === "active" && !user.isActive) return false;
      if (tab === "inactive" && user.isActive) return false;
      if (query && !`${user.fullName} ${user.phone}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [users, search, tab]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const visibleUsers = filteredUsers.slice((tablePage - 1) * pageSize, tablePage * pageSize);

  const stats = useMemo(() => {
    const active = users.filter((u) => u.isActive).length;
    const inactive = users.filter((u) => !u.isActive).length;
    const owners = users.filter((u) => u.role === Role.Owner).length;
    return { total: users.length, active, inactive, owners, roleCount: ROLE_KEYS.length };
  }, [users]);

  function exportCsv() {
    const rows = filteredUsers.map((user) => [
      user.fullName,
      roleLabels[NUMERIC_ROLE_TO_FRONTEND[user.role]],
      user.phone,
      user.isActive ? s.statusActive : s.statusInactive,
    ]);
    const csv = [[s.csvUser, s.csvRole, s.csvPhone, s.csvStatus], ...rows]
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
    <AppLayout title={s.pageTitle} subtitle={s.pageSubtitle} search={{ value: search, onChange: (value) => { setSearch(value); setTablePage(1); }, placeholder: s.searchPlaceholder }}>
      <div className="users-page">
        <div className="users-overview-row">
          <div className="users-kpi-grid">
            <UserKpi icon={UserRound} tone="green" label={s.kpiTotal} value={String(stats.total)} suffix={s.kpiTotalSuffix} />
            <UserKpi icon={UserCheck} tone="blue" label={s.kpiActive} value={String(stats.active)} suffix={s.kpiActiveSuffix} />
            <UserKpi icon={UserX} tone="orange" label={s.kpiInactive} value={String(stats.inactive)} suffix={s.kpiInactiveSuffix} />
            <UserKpi icon={ShieldCheck} tone="purple" label={s.kpiAdmins} value={String(stats.owners)} suffix={s.kpiAdminsSuffix} />
            <UserKpi icon={Grid2X2} tone="yellow" label={s.kpiRoles} value={String(stats.roleCount)} suffix={s.kpiRolesSuffix} />
          </div>
          <div className="users-top-actions">
            <Button onClick={() => setCreateOpen(true)}><Plus size={15} /> {s.addUser}</Button>
            <Button variant="secondary" onClick={exportCsv} disabled={filteredUsers.length === 0}><Download size={15} /> {s.export}</Button>
          </div>
        </div>

        <div className="users-content-grid">
          <Card className="users-table-card">
            <div className="users-tabs">
              {([['all', s.tabAll], ['active', s.tabActive], ['inactive', s.tabInactive]] as [UserTab, string][]).map(([key, label]) => (
                <button key={key} type="button" className={tab === key ? "active" : ""} onClick={() => { setTab(key); setTablePage(1); }}>{label}</button>
              ))}
            </div>

            {isLoading ? (
              <div className="p-4">{Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={6} />)}</div>
            ) : isError ? (
              <EmptyState
                icon={AlertCircle}
                title="Не удалось загрузить пользователей"
                description={normalizeApiError(error).message}
                action={<Button variant="outline" size="sm" onClick={() => refetch()}>Повторить</Button>}
              />
            ) : visibleUsers.length === 0 ? (
              <EmptyState icon={UserRound} title="Пользователей пока нет" description="Добавьте первого пользователя" />
            ) : (
              <>
                <div className="users-table-scroll">
                  <table>
                    <thead><tr><th>{s.colUser}</th><th>{s.colRole}</th><th>{s.colPhone}</th><th>{s.colStatus}</th><th>{s.colRegisteredAt}</th><th>{s.colActions}</th></tr></thead>
                    <tbody>
                      {visibleUsers.map((user) => {
                        const role = NUMERIC_ROLE_TO_FRONTEND[user.role];
                        const isSelf = user.id === currentUser?.id;
                        return (
                          <tr key={user.id}>
                            <td><div className="users-person"><Avatar name={user.fullName} size="sm" /><div><strong>{user.fullName}</strong></div></div></td>
                            <td><span className={`user-role ${ROLE_CLASS_NAME[role]}`}>{roleLabels[role]}</span></td>
                            <td className="nowrap">{user.phone}</td>
                            <td><span className={`user-status ${user.isActive ? "active" : "inactive"}`}>{user.isActive ? s.statusActive : s.statusBlocked}</span></td>
                            <td className="nowrap">{new Date(user.createdAt).toLocaleDateString("ru-RU")}</td>
                            <td className="text-right">
                              <div className="flex items-center justify-end">
                                <DropdownMenu
                                  trigger={<MoreVertical size={16} />}
                                  items={[
                                    { label: s.actionView, icon: <Eye size={14} />, onClick: () => setViewing(user) },
                                    {
                                      label: isSelf ? s.actionChangeStatusDisabled : user.isActive ? "Заблокировать" : "Разблокировать",
                                      icon: <Power size={14} />,
                                      onClick: () => (user.isActive ? blockMutation.mutate(user.id) : unblockMutation.mutate(user.id)),
                                      disabled: isSelf,
                                    },
                                  ]}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="users-pagination">
                  <span>{strings.common.paginationShown(visibleUsers.length ? (tablePage - 1) * pageSize + 1 : 0, Math.min(tablePage * pageSize, filteredUsers.length), filteredUsers.length, s.paginationItemLabel)}</span>
                  <div><button type="button" onClick={() => setTablePage((value) => Math.max(1, value - 1))}>‹</button>{Array.from({ length: pageCount }, (_, index) => <button type="button" key={index} className={tablePage === index + 1 ? "active" : ""} onClick={() => setTablePage(index + 1)}>{index + 1}</button>)}<button type="button" onClick={() => setTablePage((value) => Math.min(pageCount, value + 1))}>›</button></div>
                  <label>
                    {strings.common.showPerPage}{" "}
                    <CustomSelect
                      size="sm"
                      value={String(pageSize)}
                      onValueChange={(value) => { setPageSize(Number(value)); setTablePage(1); }}
                      options={[{ value: "10", label: "10" }, { value: "25", label: "25" }, { value: "50", label: "50" }]}
                    />
                  </label>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        submitting={createMutation.isPending}
        onSubmit={(request) =>
          createMutation.mutate(request, {
            onSuccess: (result) => {
              setCreateOpen(false);
              setJustCreated(result);
            },
          })
        }
      />

      <ViewUserModal user={viewing} roleLabels={roleLabels} onClose={() => setViewing(null)} s={s} />

      <TemporaryPasswordModal result={justCreated} onClose={() => setJustCreated(null)} />
    </AppLayout>
  );
}

function UserKpi({ icon: Icon, tone, label, value, suffix }: { icon: typeof UserRound; tone: string; label: string; value: string; suffix: string }) {
  return <Card className="user-kpi"><span className={`user-kpi-icon ${tone}`}><Icon size={20} /></span><div><p>{label}</p><strong>{value}</strong><span>{suffix}</span></div></Card>;
}

const CREATE_ROLE_OPTIONS: { value: BackendRole; label: string; role: Role }[] = [
  { value: "Owner", label: "Владелец", role: Role.Owner },
  { value: "Prorab", label: "Прораб", role: Role.Prorab },
  { value: "Brigadir", label: "Бригадир", role: Role.Brigadir },
  { value: "Accountant", label: "Бухгалтер", role: Role.Accountant },
];

function CreateUserModal({
  open,
  onClose,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  submitting: boolean;
  onSubmit: (request: { fullName: string; phone: string; role: Role }) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>(Role.Brigadir);
  const [error, setError] = useState("");

  function handleClose() {
    setFullName("");
    setPhone("");
    setRole(Role.Brigadir);
    setError("");
    onClose();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      setError("Заполните имя и телефон");
      return;
    }
    if (!TAJIK_PHONE_RE.test(phone.trim())) {
      setError("Неверный формат телефона");
      return;
    }
    onSubmit({ fullName: fullName.trim(), phone: phone.trim(), role });
  }

  return (
    <Modal open={open} onClose={handleClose} title="Новый пользователь" description="POST /users — Owner заводит учётную запись с временным паролем" size="md">
      <form className="users-modal-form" onSubmit={handleSubmit}>
        <label><span>Полное имя</span><input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Фируз Рахмонов" /></label>
        <label><span>Телефон</span><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+992 90 456 78 90" /></label>
        <label>
          <span>Роль</span>
          <CustomSelect
            fullWidth
            value={String(role)}
            onValueChange={(value) => setRole(Number(value) as Role)}
            options={CREATE_ROLE_OPTIONS.map((opt) => ({ value: String(opt.role), label: opt.label }))}
          />
        </label>
        {error && <p className="users-modal-error" role="alert">{error}</p>}
        <div className="users-modal-actions">
          <Button type="button" variant="secondary" onClick={handleClose}>Отмена</Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Создание..." : "Создать"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ViewUserModal({ user, roleLabels, onClose, s }: { user: UserDto | null; roleLabels: Record<UserRole, string>; onClose: () => void; s: UsersStrings }) {
  return (
    <Modal open={user !== null} onClose={onClose} title={s.modalViewTitle} description={user ? user.phone : undefined} size="md">
      {user && (
        <div className="users-modal-form">
          <label><span>{s.fieldFullName}</span><input readOnly value={user.fullName} /></label>
          <label><span>{s.fieldPhone}</span><input readOnly value={user.phone} /></label>
          <label><span>{s.fieldRole}</span><input readOnly value={roleLabels[NUMERIC_ROLE_TO_FRONTEND[user.role]]} /></label>
          <label><span>{s.fieldStatus}</span><input readOnly value={user.isActive ? s.statusActive : s.statusBlocked} /></label>
          {user.forcePasswordChange && <p className="text-sm text-ink-secondary">Ожидается смена временного пароля при первом входе.</p>}
          <div className="users-modal-actions"><Button type="button" variant="secondary" onClick={onClose}>{s.buttonClose}</Button></div>
        </div>
      )}
    </Modal>
  );
}

function TemporaryPasswordModal({ result, onClose }: { result: { user: UserDto; temporaryPassword: string } | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(result!.temporaryPassword).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Modal open={result !== null} onClose={onClose} title="Пользователь создан" description="Временный пароль показывается один раз — сохраните или передайте его пользователю" size="md">
      {result && (
        <div className="users-modal-form">
          <p className="text-sm text-ink-secondary">{result.user.fullName} · {result.user.phone}</p>
          <div className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface-2 px-3 py-2 font-mono text-sm">
            <span className="flex-1 select-all">{result.temporaryPassword}</span>
            <Button type="button" variant="ghost" size="sm" onClick={copy}><Copy size={14} /> {copied ? "Скопировано" : "Копировать"}</Button>
          </div>
          <p className="text-xs text-ink-muted">При первом входе пользователю будет предложено сменить пароль.</p>
          <div className="users-modal-actions"><Button type="button" onClick={onClose}>Готово</Button></div>
        </div>
      )}
    </Modal>
  );
}
