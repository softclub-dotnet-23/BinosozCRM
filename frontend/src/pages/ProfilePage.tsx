import { Calendar, Phone, ShieldCheck } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useCurrentUser } from "../hooks/api/useUsers";
import { normalizeApiError } from "../services/apiError";

/** GET /users/me — for Owner/Prorab/Accountant. Brigadir has its own richer profile page
 * (BrigadirProfilePage) that also resolves their own Worker record. */
export default function ProfilePage() {
  const { user } = useAuth();
  const { strings } = useLanguage();
  const c = strings.common;
  const { data: account, isLoading, isError, error, refetch } = useCurrentUser();

  return (
    <AppLayout title={c.profileTitle} subtitle="">
      <Card className="max-w-md p-6">
        {isLoading ? (
          <p className="text-sm text-ink-secondary">Загрузка...</p>
        ) : isError ? (
          <div className="space-y-3">
            <p className="text-sm text-red">{normalizeApiError(error).message}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Повторить</Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Avatar name={account?.fullName ?? user?.fullName ?? ""} size="md" />
              <div>
                <p className="text-base font-semibold text-ink">{account?.fullName ?? user?.fullName}</p>
                <p className="text-xs text-ink-muted">{c.roleLabels[user!.role]}</p>
              </div>
            </div>
            <div className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
              <Row icon={ShieldCheck} label={c.profileRole} value={c.roleLabels[user!.role]} />
              {account?.phone && <Row icon={Phone} label={c.profilePhone} value={account.phone} />}
              {account?.createdAt && <Row icon={Calendar} label={c.profileRegisteredAt} value={new Date(account.createdAt).toLocaleDateString("ru-RU")} />}
            </div>
          </>
        )}
      </Card>
    </AppLayout>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof ShieldCheck; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon size={15} className="text-ink-muted" />
      <span className="text-ink-secondary">{label}</span>
      <span className="ml-auto font-semibold text-ink">{value}</span>
    </div>
  );
}
