import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bell,
  Building2,
  Check,
  CircleHelp,
  Clock3,
  CloudDownload,
  DatabaseBackup,
  FileCog,
  FilePenLine,
  FileText,
  HardDrive,
  Info,
  KeyRound,
  Landmark,
  Link2,
  Monitor,
  Moon,
  Search,
  Settings2,
  ShieldCheck,
  Sun,
  Upload,
  UserRound,
  Wrench,
} from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { CustomSelect } from "../components/ui/CustomSelect";
import { usePersistentState } from "../hooks/usePersistentState";
import { useRepositorySnapshot } from "../hooks/useRepositoryState";
import { useToast } from "../hooks/useToast";
import { usersRepository } from "../data/repositories";
import { useLanguage } from "../context/LanguageContext";
import { APP_LANGUAGES } from "../lib/i18n/appStrings";
import type { AppStrings } from "../lib/i18n/appStrings";
import { applyAppearanceSettings } from "../lib/applyAppearanceSettings";
import "../styles/settings.css";

type SettingsTab = "general" | "company" | "finance" | "notifications" | "security" | "integrations" | "backups";
type ThemeMode = "light" | "dark" | "system";

export interface AppSettings {
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  currency: string;
  measurement: string;
  theme: ThemeMode;
  accent: string;
  density: string;
  sidebar: string;
  animations: boolean;
  automaticBackup: boolean;
  confirmDelete: boolean;
  activityLog: boolean;
  autoCloseTasks: boolean;
  stockCheck: boolean;
  documentNumbering: boolean;
  documentPrefix: string;
  printForms: boolean;
  documentSignature: boolean;
  watermark: boolean;
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  companyAddress: string;
  taxId: string;
  vatRate: string;
  fiscalYear: string;
  emailNotifications: boolean;
  browserNotifications: boolean;
  deadlineNotifications: boolean;
  stockNotifications: boolean;
  sessionMinutes: string;
  twoFactor: boolean;
  passwordExpiry: boolean;
  loginAlerts: boolean;
  apiUrl: string;
  webhookUrl: string;
  apiEnabled: boolean;
  oneCEnabled: boolean;
  telegramEnabled: boolean;
  backupFrequency: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  timezone: "Asia/Dushanbe", dateFormat: "DD.MM.YYYY", timeFormat: "24", currency: "TJS", measurement: "metric",
  theme: "light", accent: "#FF5A00", density: "comfortable", sidebar: "expanded", animations: true,
  automaticBackup: true, confirmDelete: true, activityLog: true, autoCloseTasks: false, stockCheck: true,
  documentNumbering: true, documentPrefix: "BSZ", printForms: true, documentSignature: false, watermark: false,
  companyName: "BINOSOZ Construction", companyPhone: "+992 00 000 00 00", companyEmail: "info@binosoz.tj", companyAddress: "Душанбе, Таджикистан", taxId: "",
  vatRate: "18", fiscalYear: "calendar", emailNotifications: true, browserNotifications: true, deadlineNotifications: true, stockNotifications: true,
  sessionMinutes: "60", twoFactor: false, passwordExpiry: true, loginAlerts: true,
  apiUrl: "https://api.binosoz.tj", webhookUrl: "", apiEnabled: false, oneCEnabled: false, telegramEnabled: false, backupFrequency: "daily",
};

export default function SettingsPage() {
  const { showToast } = useToast();
  const { language, setLanguage, strings } = useLanguage();
  const s = strings.settings;
  const users = useRepositorySnapshot(usersRepository);
  const [settings, setSettings] = usePersistentState<AppSettings>("app.settings.v1", DEFAULT_SETTINGS);
  const [tab, setTab] = usePersistentState<SettingsTab>("settings.active-tab", "general");
  const [search, setSearch] = useState("");
  const [lastSaved, setLastSaved] = useState("");
  const restoreInput = useRef<HTMLInputElement>(null);

  const TABS: { key: SettingsTab; label: string; icon: typeof Settings2 }[] = [
    { key: "general", label: s.tabs.general, icon: Settings2 },
    { key: "company", label: s.tabs.company, icon: Building2 },
    { key: "finance", label: s.tabs.finance, icon: Landmark },
    { key: "notifications", label: s.tabs.notifications, icon: Bell },
    { key: "security", label: s.tabs.security, icon: ShieldCheck },
    { key: "integrations", label: s.tabs.integrations, icon: Link2 },
    { key: "backups", label: s.tabs.backups, icon: DatabaseBackup },
  ];

  const SEARCH_INDEX: [string, SettingsTab][] = [
    [s.general.language, "general"], [s.general.timezone, "general"], [s.general.theme, "general"], [s.general.accent, "general"],
    [s.company.companyName, "company"], [s.company.companyAddress, "company"], [s.finance.currency, "finance"], [s.finance.vatRate, "finance"],
    [s.notifications.email, "notifications"], [s.notifications.browser, "notifications"], [s.security.twoFactor, "security"],
    [s.security.sessionMinutes, "security"], ["API", "integrations"], ["Telegram", "integrations"], [s.backups.cardTitle, "backups"],
  ];

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => setSettings((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    applyAppearanceSettings({
      theme: settings.theme,
      density: settings.density,
      sidebar: settings.sidebar,
      accent: settings.accent,
      animations: settings.animations,
    });
  }, [settings.theme, settings.density, settings.sidebar, settings.accent, settings.animations]);

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? SEARCH_INDEX.filter(([label]) => label.toLowerCase().includes(query)) : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, strings]);

  function saveSection(section: string) {
    const time = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date());
    setLastSaved(time);
    showToast(`${section}: ${s.save.toLowerCase()}`);
  }

  function downloadBackup() {
    const snapshot: Record<string, unknown> = {};
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key) snapshot[key] = localStorage.getItem(key);
    }
    const blob = new Blob([JSON.stringify({ createdAt: new Date().toISOString(), data: snapshot }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `binosoz-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(s.backups.createBackup);
  }

  function restoreBackup(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as { data?: Record<string, string> };
        if (!parsed.data || typeof parsed.data !== "object") throw new Error("invalid");
        Object.entries(parsed.data).forEach(([key, value]) => localStorage.setItem(key, value));
        showToast(s.backups.restoreBackup);
        window.setTimeout(() => window.location.reload(), 500);
      } catch {
        showToast(s.backups.restoreBackup);
      }
    };
    reader.readAsText(file);
  }

  return (
    <AppLayout title={s.pageTitle} subtitle={s.pageSubtitle} search={{ value: search, onChange: setSearch, placeholder: s.searchPlaceholder }}>
      <div className="settings-page">
        <nav className="settings-tabs" aria-label={s.tabs.general}>{TABS.map((item) => <button type="button" key={item.key} className={tab === item.key ? "active" : ""} onClick={() => setTab(item.key)}><item.icon size={13} />{item.label}</button>)}</nav>

        {search.trim() && <Card className="settings-search-results"><div><Search size={15} /><strong>{s.searchResults}</strong></div>{searchResults.length ? searchResults.map(([label, target]) => <button type="button" key={label} onClick={() => { setTab(target); setSearch(""); }}>{label}<span>{s.openAction}</span></button>) : <p>{s.noResultsFound}</p>}</Card>}

        <div className="settings-content-grid">
          <main className="settings-main">
            {tab === "general" && (
              <GeneralSettings
                settings={settings}
                update={update}
                onSave={saveSection}
                s={s}
                language={language}
                setLanguage={setLanguage}
              />
            )}
            {tab === "company" && <CompanySettings settings={settings} update={update} onSave={saveSection} s={s} />}
            {tab === "finance" && <FinanceSettings settings={settings} update={update} onSave={saveSection} s={s} />}
            {tab === "notifications" && <NotificationSettings settings={settings} update={update} onSave={saveSection} s={s} />}
            {tab === "security" && <SecuritySettings settings={settings} update={update} onSave={saveSection} s={s} />}
            {tab === "integrations" && <IntegrationSettings settings={settings} update={update} onSave={saveSection} s={s} />}
            {tab === "backups" && <BackupSettings settings={settings} update={update} onSave={saveSection} s={s} download={downloadBackup} restore={() => restoreInput.current?.click()} />}
          </main>

          <aside className="settings-aside">
            <SystemInfo usersCount={users.length} s={s} />
            <SystemActivity s={s} />
          </aside>
        </div>

        <footer className="settings-footer"><span>{s.footerCopyright}</span><div><button type="button"><CircleHelp size={13} /> {s.support}</button><button type="button"><FileText size={13} /> {s.documentation}</button>{lastSaved && <span>{s.savedAt} {lastSaved}</span>}</div></footer>
        <input ref={restoreInput} className="hidden" type="file" accept="application/json" onChange={(event) => event.target.files?.[0] && restoreBackup(event.target.files[0])} />
      </div>
    </AppLayout>
  );
}

type UpdateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
type SettingsStrings = AppStrings["settings"];

function GeneralSettings({
  settings,
  update,
  onSave,
  s,
  language,
  setLanguage,
}: {
  settings: AppSettings;
  update: UpdateSetting;
  onSave: (section: string) => void;
  s: SettingsStrings;
  language: string;
  setLanguage: (value: "tj" | "ru" | "en") => void;
}) {
  const g = s.general;
  return <div className="settings-card-grid">
    <SettingsCard icon={Settings2} title={g.generalCardTitle} saveLabel={s.save} onSave={() => onSave(g.generalCardTitle)}>
      <SelectRow label={g.language} description={g.languageDescription} value={language} onChange={(value) => setLanguage(value as "tj" | "ru" | "en")} options={APP_LANGUAGES} />
      <SelectRow label={g.timezone} description={g.timezoneDescription} value={settings.timezone} onChange={(value) => update("timezone", value)} options={[{ value: "Asia/Dushanbe", label: "Душанбе (UTC+5)" }, { value: "Asia/Tashkent", label: "Ташкент (UTC+5)" }, { value: "Europe/Moscow", label: "Москва (UTC+3)" }]} notImplemented={g.notImplemented} />
      <SelectRow label={g.dateFormat} description={g.dateFormatDescription} value={settings.dateFormat} onChange={(value) => update("dateFormat", value)} options={[{ value: "DD.MM.YYYY", label: "DD.MM.YYYY" }, { value: "YYYY-MM-DD", label: "YYYY-MM-DD" }, { value: "MM/DD/YYYY", label: "MM/DD/YYYY" }]} />
      <SelectRow label={g.timeFormat} description={g.timeFormatDescription} value={settings.timeFormat} onChange={(value) => update("timeFormat", value)} options={[{ value: "24", label: "24 часа (23:59)" }, { value: "12", label: "12 часов (11:59 PM)" }]} />
      <SelectRow label={g.currency} description={g.currencyDescription} value={settings.currency} onChange={(value) => update("currency", value)} options={[{ value: "TJS", label: "Сомони (TJS)" }, { value: "USD", label: "Доллар (USD)" }, { value: "RUB", label: "Рубль (RUB)" }]} notImplemented={g.notImplemented} />
      <SelectRow label={g.measurement} description={g.measurementDescription} value={settings.measurement} onChange={(value) => update("measurement", value)} options={[{ value: "metric", label: "Метрическая (м, кг)" }, { value: "imperial", label: "Имперская (ft, lb)" }]} notImplemented={g.notImplemented} />
    </SettingsCard>

    <SettingsCard icon={Monitor} title={g.displayCardTitle} saveLabel={s.save} onSave={() => onSave(g.displayCardTitle)}>
      <div className="settings-block"><LabelText label={g.theme} description={g.themeDescription} /><div className="theme-options"><ChoiceButton active={settings.theme === "light"} onClick={() => update("theme", "light")} icon={Sun} label={g.themeLight} /><ChoiceButton active={settings.theme === "dark"} onClick={() => update("theme", "dark")} icon={Moon} label={g.themeDark} /><ChoiceButton active={settings.theme === "system"} onClick={() => update("theme", "system")} icon={Monitor} label={g.themeSystem} /></div></div>
      <div className="settings-block color-setting"><LabelText label={g.accent} description={g.accentDescription} /><div className="color-swatches">{["#FF5A00", "#16A34A", "#3182F6", "#8B5CF6", "#E11D48", "#1595A3", "#A8B1C2"].map((color) => <button type="button" aria-label={`${g.accent} ${color}`} key={color} style={{ background: color }} className={settings.accent === color ? "active" : ""} onClick={() => update("accent", color)}>{settings.accent === color && <Check size={11} />}</button>)}</div></div>
      <SegmentRow label={g.density} description={g.densityDescription} value={settings.density} onChange={(value) => update("density", value)} items={[["compact", g.densityCompact], ["comfortable", g.densityComfortable], ["spacious", g.densitySpacious]]} />
      <SegmentRow label={g.sidebarMode} description={g.sidebarModeDescription} value={settings.sidebar} onChange={(value) => update("sidebar", value)} items={[["collapsed", g.sidebarCollapsed], ["expanded", g.sidebarExpanded]]} />
      <SwitchRow label={g.animations} description={g.animationsDescription} checked={settings.animations} onChange={(value) => update("animations", value)} />
    </SettingsCard>

    <SettingsCard icon={Wrench} title={g.workCardTitle} saveLabel={s.save} onSave={() => onSave(g.workCardTitle)}>
      <SwitchRow label={g.automaticBackup} description={g.automaticBackupDescription} checked={settings.automaticBackup} onChange={(value) => update("automaticBackup", value)} notImplemented={g.notImplemented} />
      <SwitchRow label={g.confirmDelete} description={g.confirmDeleteDescription} checked={settings.confirmDelete} onChange={(value) => update("confirmDelete", value)} />
      <SwitchRow label={g.activityLog} description={g.activityLogDescription} checked={settings.activityLog} onChange={(value) => update("activityLog", value)} notImplemented={g.notImplemented} />
      <SwitchRow label={g.autoCloseTasks} description={g.autoCloseTasksDescription} checked={settings.autoCloseTasks} onChange={(value) => update("autoCloseTasks", value)} notImplemented={g.notImplemented} />
      <SwitchRow label={g.stockCheck} description={g.stockCheckDescription} checked={settings.stockCheck} onChange={(value) => update("stockCheck", value)} />
    </SettingsCard>

    <SettingsCard icon={FileCog} title={g.documentsCardTitle} saveLabel={s.save} onSave={() => onSave(g.documentsCardTitle)}>
      <SwitchRow label={g.documentNumbering} description={g.documentNumberingDescription} checked={settings.documentNumbering} onChange={(value) => update("documentNumbering", value)} notImplemented={g.notImplemented} />
      <TextRow label={g.documentPrefix} description={g.documentPrefixDescription} value={settings.documentPrefix} onChange={(value) => update("documentPrefix", value)} notImplemented={g.notImplemented} />
      <SwitchRow label={g.printForms} description={g.printFormsDescription} checked={settings.printForms} onChange={(value) => update("printForms", value)} notImplemented={g.notImplemented} />
      <SwitchRow label={g.documentSignature} description={g.documentSignatureDescription} checked={settings.documentSignature} onChange={(value) => update("documentSignature", value)} notImplemented={g.notImplemented} />
      <SwitchRow label={g.watermark} description={g.watermarkDescription} checked={settings.watermark} onChange={(value) => update("watermark", value)} notImplemented={g.notImplemented} />
    </SettingsCard>
  </div>;
}

function CompanySettings({ settings, update, onSave, s }: SectionProps) {
  const c = s.company;
  return <div className="settings-card-grid">
    <SettingsCard icon={Building2} title={c.cardTitle} saveLabel={s.save} onSave={() => onSave(c.cardTitle)}>
      <TextRow label={c.companyName} value={settings.companyName} onChange={(v) => update("companyName", v)} />
      <TextRow label={c.companyPhone} value={settings.companyPhone} onChange={(v) => update("companyPhone", v)} notImplemented={s.general.notImplemented} />
      <TextRow label={c.companyEmail} value={settings.companyEmail} onChange={(v) => update("companyEmail", v)} notImplemented={s.general.notImplemented} />
      <TextRow label={c.companyAddress} value={settings.companyAddress} onChange={(v) => update("companyAddress", v)} notImplemented={s.general.notImplemented} />
      <TextRow label={c.taxId} value={settings.taxId} onChange={(v) => update("taxId", v)} notImplemented={s.general.notImplemented} />
    </SettingsCard>
    <InfoPanel icon={FileText} title={c.infoTitle} text={c.infoText} />
  </div>;
}

function FinanceSettings({ settings, update, onSave, s }: SectionProps) {
  const f = s.finance;
  return <div className="settings-card-grid">
    <SettingsCard icon={Landmark} title={f.cardTitle} saveLabel={s.save} onSave={() => onSave(f.cardTitle)}>
      <SelectRow label={f.currency} value={settings.currency} onChange={(v) => update("currency", v)} options={[{ value: "TJS", label: "Сомони (TJS)" }, { value: "USD", label: "Доллар (USD)" }, { value: "RUB", label: "Рубль (RUB)" }]} notImplemented={s.general.notImplemented} />
      <TextRow label={f.vatRate} value={settings.vatRate} onChange={(v) => update("vatRate", v)} notImplemented={s.general.notImplemented} />
      <SelectRow label={f.fiscalYear} value={settings.fiscalYear} onChange={(v) => update("fiscalYear", v)} options={[{ value: "calendar", label: f.fiscalYearCalendar }, { value: "april", label: f.fiscalYearApril }]} notImplemented={s.general.notImplemented} />
    </SettingsCard>
    <InfoPanel icon={Info} title={f.infoTitle} text={f.infoText} />
  </div>;
}

function NotificationSettings({ settings, update, onSave, s }: SectionProps) {
  const n = s.notifications;
  return <div className="settings-card-grid">
    <SettingsCard icon={Bell} title={n.cardTitle} saveLabel={s.save} onSave={() => onSave(n.cardTitle)}>
      <SwitchRow label={n.email} checked={settings.emailNotifications} onChange={(v) => update("emailNotifications", v)} notImplemented={s.general.notImplemented} />
      <SwitchRow label={n.browser} checked={settings.browserNotifications} onChange={(v) => update("browserNotifications", v)} notImplemented={s.general.notImplemented} />
      <SwitchRow label={n.deadlines} checked={settings.deadlineNotifications} onChange={(v) => update("deadlineNotifications", v)} />
      <SwitchRow label={n.stock} checked={settings.stockNotifications} onChange={(v) => update("stockNotifications", v)} />
    </SettingsCard>
    <InfoPanel icon={Bell} title={n.infoTitle} text={n.infoText} />
  </div>;
}

function SecuritySettings({ settings, update, onSave, s }: SectionProps) {
  const sec = s.security;
  return <div className="settings-card-grid">
    <SettingsCard icon={ShieldCheck} title={sec.cardTitle} saveLabel={s.save} onSave={() => onSave(sec.cardTitle)}>
      <SelectRow label={sec.sessionMinutes} value={settings.sessionMinutes} onChange={(v) => update("sessionMinutes", v)} options={[{ value: "30", label: "30 минут" }, { value: "60", label: "1 час" }, { value: "240", label: "4 часа" }, { value: "480", label: "8 часов" }]} />
      <SwitchRow label={sec.twoFactor} checked={settings.twoFactor} onChange={(v) => update("twoFactor", v)} notImplemented={s.general.notImplemented} />
      <SwitchRow label={sec.passwordExpiry} checked={settings.passwordExpiry} onChange={(v) => update("passwordExpiry", v)} notImplemented={s.general.notImplemented} />
      <SwitchRow label={sec.loginAlerts} checked={settings.loginAlerts} onChange={(v) => update("loginAlerts", v)} notImplemented={s.general.notImplemented} />
    </SettingsCard>
    <InfoPanel icon={KeyRound} title={sec.infoTitle} text={sec.infoText} />
  </div>;
}

function IntegrationSettings({ settings, update, onSave, s }: SectionProps) {
  const i = s.integrations;
  return <div className="settings-card-grid">
    <SettingsCard icon={Link2} title={i.cardTitle} saveLabel={s.save} onSave={() => onSave(i.cardTitle)}>
      <SwitchRow label={i.apiEnabled} checked={settings.apiEnabled} onChange={(v) => update("apiEnabled", v)} notImplemented={s.general.notImplemented} />
      <TextRow label={i.apiUrl} value={settings.apiUrl} onChange={(v) => update("apiUrl", v)} notImplemented={s.general.notImplemented} />
      <TextRow label={i.webhookUrl} value={settings.webhookUrl} onChange={(v) => update("webhookUrl", v)} notImplemented={s.general.notImplemented} />
      <SwitchRow label={i.oneC} checked={settings.oneCEnabled} onChange={(v) => update("oneCEnabled", v)} notImplemented={s.general.notImplemented} />
      <SwitchRow label={i.telegram} checked={settings.telegramEnabled} onChange={(v) => update("telegramEnabled", v)} notImplemented={s.general.notImplemented} />
    </SettingsCard>
    <InfoPanel icon={Link2} title={i.infoTitle} text={i.infoText} />
  </div>;
}

function BackupSettings({ settings, update, onSave, s, download, restore }: SectionProps & { download: () => void; restore: () => void }) {
  const b = s.backups;
  return <div className="settings-card-grid">
    <SettingsCard icon={DatabaseBackup} title={b.cardTitle} saveLabel={s.save} onSave={() => onSave(b.cardTitle)}>
      <SwitchRow label={b.automaticCopies} checked={settings.automaticBackup} onChange={(v) => update("automaticBackup", v)} notImplemented={s.general.notImplemented} />
      <SelectRow label={b.frequency} value={settings.backupFrequency} onChange={(v) => update("backupFrequency", v)} options={[{ value: "daily", label: b.frequencyDaily }, { value: "weekly", label: b.frequencyWeekly }, { value: "monthly", label: b.frequencyMonthly }]} notImplemented={s.general.notImplemented} />
      <div className="backup-actions"><Button type="button" onClick={download}><CloudDownload size={15} />{b.createBackup}</Button><Button type="button" variant="secondary" onClick={restore}><Upload size={15} />{b.restoreBackup}</Button></div>
    </SettingsCard>
    <InfoPanel icon={HardDrive} title={b.infoTitle} text={b.infoText} />
  </div>;
}

interface SectionProps { settings: AppSettings; update: UpdateSetting; onSave: (section: string) => void; s: SettingsStrings; }

function SettingsCard({ icon: Icon, title, saveLabel, onSave, children }: { icon: typeof Settings2; title: string; saveLabel: string; onSave: () => void; children: ReactNode }) { return <Card className="settings-card"><header><div><Icon size={16} /><h2>{title}</h2></div><button type="button" onClick={onSave}><Check size={13} />{saveLabel}</button></header><div className="settings-card-body">{children}</div></Card>; }
function LabelText({ label, description }: { label: string; description?: string }) { return <div className="setting-label"><strong>{label}</strong>{description && <span>{description}</span>}</div>; }
function NotImplementedNote({ text }: { text?: string }) { return text ? <span className="setting-not-implemented">{text}</span> : null; }
function SelectRow({ label, description, value, onChange, options, notImplemented }: { label: string; description?: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; notImplemented?: string }) { return <div className="setting-row"><LabelText label={label} description={description} /><div><CustomSelect size="sm" fullWidth value={value} onValueChange={onChange} options={options} /><NotImplementedNote text={notImplemented} /></div></div>; }
function TextRow({ label, description, value, onChange, notImplemented }: { label: string; description?: string; value: string; onChange: (value: string) => void; notImplemented?: string }) { return <div className="setting-row"><LabelText label={label} description={description} /><div><input className="setting-input" value={value} onChange={(event) => onChange(event.target.value)} /><NotImplementedNote text={notImplemented} /></div></div>; }
function SwitchRow({ label, description, checked, onChange, notImplemented }: { label: string; description?: string; checked: boolean; onChange: (value: boolean) => void; notImplemented?: string }) { return <div className="setting-row switch-row"><LabelText label={label} description={description} /><div><button type="button" role="switch" aria-checked={checked} className={`setting-switch ${checked ? "on" : ""}`} onClick={() => onChange(!checked)}><span /></button><NotImplementedNote text={notImplemented} /></div></div>; }
function ChoiceButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Sun; label: string }) { return <button type="button" className={active ? "active" : ""} onClick={onClick}><Icon size={17} /><span>{label}</span></button>; }
function SegmentRow({ label, description, value, onChange, items, notImplemented }: { label: string; description?: string; value: string; onChange: (value: string) => void; items: [string, string][]; notImplemented?: string }) { return <div className="setting-row segment-row"><LabelText label={label} description={description} /><div><div>{items.map(([key, text]) => <button type="button" key={key} className={value === key ? "active" : ""} onClick={() => onChange(key)}>{text}</button>)}</div><NotImplementedNote text={notImplemented} /></div></div>; }
function InfoPanel({ icon: Icon, title, text }: { icon: typeof Info; title: string; text: string }) { return <Card className="settings-info-panel"><Icon size={20} /><div><h2>{title}</h2><p>{text}</p></div></Card>; }

function SystemInfo({ usersCount, s }: { usersCount: number; s: SettingsStrings }) {
  const i = s.systemInfo;
  const storage = useMemo(() => { let bytes = 0; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key) bytes += key.length + (localStorage.getItem(key)?.length ?? 0); } return Math.max(.1, bytes / 1024 / 1024).toFixed(1); }, []);
  return <Card className="system-info-card"><header><Info size={16} /><h2>{i.title}</h2></header><dl><div><dt>{i.version}</dt><dd>1.2.0</dd></div><div><dt>{i.build}</dt><dd>2026.07.22</dd></div><div><dt>{i.license}</dt><dd><span>{i.licenseActive}</span></dd></div><div><dt>{i.licenseType}</dt><dd>{i.licenseTypeValue}</dd></div><div><dt>{i.validUntil}</dt><dd>15.07.2027</dd></div><div><dt>{i.usersLabel}</dt><dd>{usersCount} {i.storageOf} 50</dd></div></dl><div className="storage-label"><span>{i.storageLabel}</span><b>{storage} MB</b></div><div className="storage-bar"><span style={{ width: `${Math.min(100, Number(storage) * 2)}%` }} /></div><p>{storage} MB</p></Card>;
}
function SystemActivity({ s }: { s: SettingsStrings }) {
  const a = s.systemActivity;
  const rows = [
    { icon: UserRound, tone: "green", title: a.login, text: "Садди Имомов", time: "09:45" },
    { icon: FileText, tone: "blue", title: a.documentCreated, text: "PR-24", time: "09:32" },
    { icon: FilePenLine, tone: "red", title: a.dataChanged, text: "ЖК «Сомони»", time: "08:15" },
    { icon: UserRound, tone: "red", title: a.userDeleted, text: "test.user", time: "17:45" },
    { icon: DatabaseBackup, tone: "green", title: a.backupCreated, text: "—", time: "02:30" },
  ];
  return <Card className="system-activity-card"><header><Clock3 size={16} /><h2>{a.title}</h2></header><div>{rows.map((row) => <article key={row.title}><span className={row.tone}><row.icon size={12} /></span><p><strong>{row.title}</strong><small>{row.text}</small></p><time>{row.time}</time></article>)}</div><button type="button">{a.viewLog} <span>→</span></button></Card>;
}
