import { useEffect, useState, type FormEvent } from "react";
import { ClipboardPlus, PackageMinus } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { CustomSelect } from "../components/ui/CustomSelect";
import { ApiError, NetworkError } from "../api/apiClient";
import { listObjectLookups, type LookupItem } from "../api/lookupsApi";
import { createMaterialRequest } from "../api/materialRequestsApi";
import { reportMaterialConsumption } from "../api/materialConsumptionApi";
import { useToast } from "../hooks/useToast";

function message(error: unknown) { return error instanceof NetworkError ? "Нет подключения к серверу" : error instanceof ApiError ? error.message : "Не удалось сохранить данные"; }

/** Brigadir-only, server-scoped material operations; no brigade id reaches the browser. */
export default function BrigadirMaterialsPage({ consumption = false }: { consumption?: boolean }) {
  const { showToast } = useToast();
  const [objects, setObjects] = useState<LookupItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ objectId: "", materialName: "", unit: "шт", qty: "", shortage: "0", comment: "" });
  useEffect(() => { void listObjectLookups({ limit: 100 }).then((items) => { setObjects(items); setForm((value) => ({ ...value, objectId: items[0]?.id ?? "" })); }).catch((cause: unknown) => setError(message(cause))); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (saving) return;
    const qty = Number(form.qty); const shortage = Number(form.shortage);
    if (!form.objectId || !form.materialName.trim() || !form.unit.trim() || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(shortage) || shortage < 0) { setError("Заполните объект, материал, единицу и корректное количество"); return; }
    setSaving(true); setError("");
    try {
      if (consumption) await reportMaterialConsumption({ objectId: form.objectId, date: new Date().toISOString().slice(0, 10), materialName: form.materialName.trim(), unit: form.unit.trim(), qtyUsed: qty, qtyShortage: shortage, comment: form.comment.trim() || undefined });
      else await createMaterialRequest({ objectId: form.objectId, materialName: form.materialName.trim(), unit: form.unit.trim(), qty });
      showToast(consumption ? "Отчёт о расходе отправлен" : "Заявка на материал создана"); setForm((value) => ({ ...value, materialName: "", qty: "", shortage: "0", comment: "" }));
    } catch (cause) { setError(message(cause)); } finally { setSaving(false); }
  }
  return <AppLayout title={consumption ? "Списание материалов" : "Заявка на материалы"} subtitle="Данные сохраняются через API вашей бригады"><Card className="mx-auto max-w-xl p-5"><form className="users-modal-form" onSubmit={submit}><label><span>Объект</span><CustomSelect fullWidth value={form.objectId} onValueChange={(objectId) => setForm((value) => ({ ...value, objectId }))} options={objects.map((item) => ({ value: item.id, label: item.name }))} /></label><label><span>Материал</span><input value={form.materialName} onChange={(e) => setForm((value) => ({ ...value, materialName: e.target.value }))} /></label><label><span>Единица</span><input value={form.unit} onChange={(e) => setForm((value) => ({ ...value, unit: e.target.value }))} /></label><label><span>{consumption ? "Израсходовано" : "Количество"}</span><input inputMode="decimal" value={form.qty} onChange={(e) => setForm((value) => ({ ...value, qty: e.target.value }))} /></label>{consumption && <><label><span>Нехватка</span><input inputMode="decimal" value={form.shortage} onChange={(e) => setForm((value) => ({ ...value, shortage: e.target.value }))} /></label><label><span>Комментарий</span><input value={form.comment} onChange={(e) => setForm((value) => ({ ...value, comment: e.target.value }))} /></label></>}{error && <p className="users-modal-error" role="alert">{error}</p>}<Button type="submit" disabled={saving || !objects.length}>{consumption ? <PackageMinus size={16} /> : <ClipboardPlus size={16} />}{saving ? "Сохранение…" : "Сохранить"}</Button></form></Card></AppLayout>;
}