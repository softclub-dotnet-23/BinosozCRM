import { Mail, Phone } from "lucide-react";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card } from "../../components/ui/Card";
import { Avatar } from "../../components/ui/Avatar";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useWorkerScope } from "../../utils/workerAccess";
import { useRepositorySnapshot } from "../../hooks/useRepositoryState";
import { usersRepository } from "../../data/repositories";

export default function WorkerProfilePage() {
  const { user } = useAuth();
  const { strings } = useLanguage();
  const s = strings.worker;
  const { employee, brigade, object } = useWorkerScope(user);
  const users = useRepositorySnapshot(usersRepository);
  const account = users.find((u) => u.id === user?.id);

  if (!user || !employee) {
    return (
      <AppLayout title={s.profilePageTitle} subtitle={s.profilePageSubtitle} titleBelowHeader contentMaxWidth="1600px">
        <Card className="p-0">
          <EmptyState title={s.emptyTasks} />
        </Card>
      </AppLayout>
    );
  }

  const rows: [string, string][] = [
    [s.profileBrigade, brigade?.name ?? "—"],
    [s.profileObject, object?.name ?? "—"],
    [s.profileSpecialty, employee.specialty],
    [s.profileGrade, String(employee.qualificationGrade)],
    [s.profilePhone, employee.phone],
  ];

  return (
    <AppLayout title={s.profilePageTitle} subtitle={s.profilePageSubtitle} titleBelowHeader contentMaxWidth="1600px">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={user.fullName} size="md" className="h-16 w-16 text-lg" />
          <div>
            <p className="text-lg font-bold text-ink">{user.fullName}</p>
            <p className="text-sm text-ink-secondary">{strings.common.roleLabels[user.role]}</p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3 border-t border-border pt-5 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 text-sm">
              <dt className="text-ink-secondary">{label}</dt>
              <dd className="font-medium text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex flex-wrap gap-3 border-t border-border pt-5">
          <a href={`tel:${employee.phone.replace(/\s+/g, "")}`} className="flex items-center gap-2 rounded-lg border border-border-strong px-3 py-2 text-sm font-medium text-ink hover:bg-surface-2">
            <Phone size={15} /> {employee.phone}
          </a>
          {account?.email && (
            <a href={`mailto:${account.email}`} className="flex items-center gap-2 rounded-lg border border-border-strong px-3 py-2 text-sm font-medium text-ink hover:bg-surface-2">
              <Mail size={15} /> {account.email}
            </a>
          )}
        </div>
      </Card>
    </AppLayout>
  );
}
