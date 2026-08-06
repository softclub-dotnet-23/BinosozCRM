import { useMemo } from "react";
import { AppLayout } from "../components/layout/AppLayout";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useCurrentUser } from "../hooks/api/useUsers";
import { useMyBrigadeWorkers } from "../hooks/api/useWorkers";
import { APP_LANGUAGES } from "../lib/i18n/appStrings";
import { normalizeApiError } from "../services/apiError";
import { cn } from "../utils/cn";
import {
  BriefcaseIcon,
  Card,
  CheckIcon,
  ClipboardIcon,
  PersonAvatar,
  PhoneIcon,
  UsersIcon,
  tone,
} from "../components/brigadir/shared";

export default function BrigadirProfilePage() {
  const { user } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { data: account, isLoading, isError, error } = useCurrentUser();
  const { data: crewData } = useMyBrigadeWorkers({ page: 1, pageSize: 200 });

  const crew = crewData?.items ?? [];
  const myWorkerRecord = useMemo(() => crew.find((w) => w.fullName === user?.fullName) ?? null, [crew, user]);

  const kpis = [
    { label: "В бригаде", value: String(crew.length), color: "green", icon: UsersIcon },
    { label: "Специальность", value: myWorkerRecord?.specialty ?? "—", color: "blue", icon: BriefcaseIcon },
    { label: "Статус", value: account?.isActive ? "Активен" : "Заблокирован", color: account?.isActive ? "green" : "red", icon: CheckIcon },
  ] as const;

  return (
    <AppLayout title="Профиль" subtitle="Личные данные бригадира" titleBelowHeader contentMaxWidth="1280px">
      {isLoading ? (
        <p className="text-sm text-ink-secondary">Загрузка...</p>
      ) : isError ? (
        <p className="text-sm text-red">{normalizeApiError(error).message}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {kpis.map((k) => (
              <Card key={k.label} className="rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", tone[k.color])}>
                    <k.icon size={20} />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold text-ink-secondary">{k.label}</p>
                    <p className="mt-1 text-[20px] font-extrabold leading-tight">{k.value}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            <Card className="rounded-2xl p-5">
              <div className="flex flex-col items-center text-center">
                <PersonAvatar name={account?.fullName ?? user?.fullName ?? ""} size={88} />
                <p className="mt-3 text-base font-bold">{account?.fullName ?? user?.fullName}</p>
                <p className="text-xs text-ink-muted">Бригадир</p>
                <div className="mt-3 w-full space-y-1.5 text-left text-xs text-ink-secondary">
                  <p className="flex items-center gap-2"><PhoneIcon size={13} className="text-ink-muted" /> {account?.phone}</p>
                </div>
                <span className={cn("mt-3 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold", account?.isActive ? "bg-green-soft text-green" : "bg-red-soft text-red")}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", account?.isActive ? "bg-green" : "bg-red")} /> {account?.isActive ? "Активен" : "Заблокирован"}
                </span>
              </div>
            </Card>

            <Card className="rounded-2xl p-5">
              <h2 className="text-[14px] font-bold">Рабочая информация</h2>
              <div className="mt-3 space-y-2.5 text-xs">
                {myWorkerRecord ? (
                  <>
                    <InfoRow label="Специальность" value={myWorkerRecord.specialty ?? "—"} />
                    <InfoRow label="Дата рождения" value={myWorkerRecord.birthDate} />
                    <InfoRow label="В бригаде с" value={myWorkerRecord.hireDate} />
                  </>
                ) : (
                  <p className="text-ink-muted">Нет связанной записи сотрудника в бригаде.</p>
                )}
                {account?.forcePasswordChange && (
                  <p className="mt-2 flex items-center gap-1.5 text-orange">
                    <ClipboardIcon size={13} /> Требуется смена пароля при следующем входе
                  </p>
                )}
              </div>
            </Card>

            <Card className="rounded-2xl p-5 lg:col-span-2">
              <h2 className="text-[14px] font-bold">Язык интерфейса</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {APP_LANGUAGES.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLanguage(opt.value as "tj" | "ru" | "en")}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-[11px] font-semibold",
                      language === opt.value ? "border-primary bg-primary text-white" : "border-border text-ink-secondary hover:bg-surface-2",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </AppLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-muted">{label}</span>
      <b className="text-right font-semibold">{value}</b>
    </div>
  );
}
