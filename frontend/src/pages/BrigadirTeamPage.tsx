import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Users } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { ApiError, NetworkError } from "../api/apiClient";
import { getMyBrigade, type Brigade } from "../api/brigadesApi";
import { listWorkerLookups, type LookupItem } from "../api/lookupsApi";

function describeError(error: unknown): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) return error.message;
  return "Не удалось загрузить бригаду";
}

/** Scoped exclusively by the authenticated Brigadir; no brigade id is accepted from the browser. */
export default function BrigadirTeamPage() {
  const [brigade, setBrigade] = useState<Brigade | null>(null);
  const [workers, setWorkers] = useState<LookupItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([getMyBrigade(), listWorkerLookups({ limit: 100 })])
      .then(([currentBrigade, currentWorkers]) => { setBrigade(currentBrigade); setWorkers(currentWorkers); })
      .catch((cause: unknown) => setError(describeError(cause)));
  }, []);

  return (
    <AppLayout title="Моя бригада" subtitle="Состав бригады, закреплённой за вашей учётной записью">
      {error ? <Card><div className="flex items-center gap-2 text-red"><AlertCircle size={18} />{error}</div></Card> : !brigade ? <Card><Loader2 className="animate-spin" /></Card> : (
        <Card className="p-5">
          <h2 className="text-[17px] font-bold text-ink">{brigade.name}</h2>
          {workers.length ? <ul className="mt-4 space-y-2">{workers.map((worker) => <li key={worker.id} className="text-ink-secondary">{worker.name}</li>)}</ul> : <EmptyState icon={Users} title="В бригаде пока нет работников" />}
        </Card>
      )}
    </AppLayout>
  );
}