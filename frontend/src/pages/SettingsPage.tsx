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
import "../styles/settings.css";

type SettingsTab = "general" | "company" | "finance" | "notifications" | "security" | "integrations" | "backups";
type ThemeMode = "light" | "dark" | "system";

interface AppSettings {
  language: string;
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
  language: "ru", timezone: "Asia/Dushanbe", dateFormat: "DD.MM.YYYY", timeFormat: "24", currency: "TJS", measurement: "metric",
  theme: "light", accent: "#FF5A00", density: "comfortable", sidebar: "expanded", animations: true,
  automaticBackup: true, confirmDelete: true, activityLog: true, autoCloseTasks: false, stockCheck: true,
  documentNumbering: true, documentPrefix: "BSZ", printForms: true, documentSignature: false, watermark: false,
  companyName: "BINOSOZ Construction", companyPhone: "+992 00 000 00 00", companyEmail: "info@binosoz.tj", companyAddress: "Душанбе, Таджикистан", taxId: "",
  vatRate: "18", fiscalYear: "calendar", emailNotifications: true, browserNotifications: true, deadlineNotifications: true, stockNotifications: true,
  sessionMinutes: "60", twoFactor: false, passwordExpiry: true, loginAlerts: true,
  apiUrl: "https://api.binosoz.tj", webhookUrl: "", apiEnabled: false, oneCEnabled: false, telegramEnabled: false, backupFrequency: "daily",
};

const TABS: { key: SettingsTab; label: string; icon: typeof Settings2 }[] = [
  { key: "general", label: "Общие", icon: Settings2 }, { key: "company", label: "Компания", icon: Building2 },
  { key: "finance", label: "Финансы", icon: Landmark }, { key: "notifications", label: "Уведомления", icon: Bell },
  { key: "security", label: "Безопасность", icon: ShieldCheck }, { key: "integrations", label: "Интеграции", icon: Link2 },
  { key: "backups", label: "Резервные копии", icon: DatabaseBackup },
];

const SEARCH_INDEX = [
  ["Язык интерфейса", "general"], ["Часовой пояс", "general"], ["Тема интерфейса", "general"], ["Цвет системы", "general"],
  ["Название компании", "company"], ["Адрес компании", "company"], ["Валюта", "finance"], ["НДС", "finance"],
  ["Email уведомления", "notifications"], ["Уведомления браузера", "notifications"], ["Двухфакторная защита", "security"],
  ["Время сессии", "security"], ["API", "integrations"], ["Telegram", "integrations"], ["Резервное копирование", "backups"],
] as const;

export default function SettingsPage() {
  const { showToast } = useToast();
  const users = useRepositorySnapshot(usersRepository);
  const [settings, setSettings] = usePersistentState<AppSettings>("app.settings.v1", DEFAULT_SETTINGS);
  const [tab, setTab] = usePersistentState<SettingsTab>("settings.active-tab", "general");
  const [search, setSearch] = useState("");
  const [lastSaved, setLastSaved] = useState("");
  const restoreInput = useRef<HTMLInputElement>(null);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => setSettings((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    const root = document.documentElement;
    const dark = settings.theme === "dark" || (settings.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.dataset.appTheme = dark ? "dark" : "light";
    root.dataset.interfaceDensity = settings.density;
    root.dataset.sidebarMode = settings.sidebar;
    root.style.setProperty("--color-primary", settings.accent);
    root.style.setProperty("--color-primary-hover", darkenHex(settings.accent));
  }, [settings.theme, settings.density, settings.sidebar, settings.accent]);

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? SEARCH_INDEX.filter(([label]) => label.toLowerCase().includes(query)) : [];
  }, [search]);

  function saveSection(section: string) {
    const time = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date());
    setLastSaved(time);
    showToast(`${section}: настройки сохранены`);
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
    showToast("Резервная копия создана");
  }

  function restoreBackup(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as { data?: Record<string, string> };
        if (!parsed.data || typeof parsed.data !== "object") throw new Error("invalid");
        Object.entries(parsed.data).forEach(([key, value]) => localStorage.setItem(key, value));
        showToast("Резервная копия восстановлена");
        window.setTimeout(() => window.location.reload(), 500);
      } catch {
        showToast("Не удалось прочитать файл резервной копии");
      }
    };
    reader.readAsText(file);
  }

  return (
    <AppLayout title="Настройки" subtitle="Управление системой и параметрами компании" search={{ value: search, onChange: setSearch, placeholder: "Поиск по настройкам..." }}>
      <div className="settings-page">
        <nav className="settings-tabs" aria-label="Разделы настроек">{TABS.map((item) => <button type="button" key={item.key} className={tab === item.key ? "active" : ""} onClick={() => setTab(item.key)}><item.icon size={13} />{item.label}</button>)}</nav>

        {search.trim() && <Card className="settings-search-results"><div><Search size={15} /><strong>Результаты поиска</strong></div>{searchResults.length ? searchResults.map(([label, target]) => <button type="button" key={label} onClick={() => { setTab(target); setSearch(""); }}>{label}<span>Открыть →</span></button>) : <p>Настройки не найдены</p>}</Card>}

        <div className="settings-content-grid">
          <main className="settings-main">
            {tab === "general" && <GeneralSettings settings={settings} update={update} onSave={saveSection} />}
            {tab === "company" && <CompanySettings settings={settings} update={update} onSave={saveSection} />}
            {tab === "finance" && <FinanceSettings settings={settings} update={update} onSave={saveSection} />}
            {tab === "notifications" && <NotificationSettings settings={settings} update={update} onSave={saveSection} />}
            {tab === "security" && <SecuritySettings settings={settings} update={update} onSave={saveSection} />}
            {tab === "integrations" && <IntegrationSettings settings={settings} update={update} onSave={saveSection} />}
            {tab === "backups" && <BackupSettings settings={settings} update={update} onSave={saveSection} download={downloadBackup} restore={() => restoreInput.current?.click()} />}
          </main>

          <aside className="settings-aside">
            <SystemInfo usersCount={users.length} />
            <SystemActivity />
          </aside>
        </div>

        <footer className="settings-footer"><span>© 2026 BINOSOZ. Все права защищены.</span><div><button type="button"><CircleHelp size={13} /> Поддержка</button><button type="button"><FileText size={13} /> Документация</button>{lastSaved && <span>Сохранено в {lastSaved}</span>}</div></footer>
        <input ref={restoreInput} className="hidden" type="file" accept="application/json" onChange={(event) => event.target.files?.[0] && restoreBackup(event.target.files[0])} />
      </div>
    </AppLayout>
  );
}

type UpdateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;

function GeneralSettings({ settings, update, onSave }: { settings: AppSettings; update: UpdateSetting; onSave: (section: string) => void }) {
  return <div className="settings-card-grid">
    <SettingsCard icon={Settings2} title="Общие настройки" onSave={() => onSave("Общие настройки")}>
      <SelectRow label="Язык интерфейса" description="Выберите язык системы" value={settings.language} onChange={(value) => update("language", value)} options={[{ value:"tj",label:"Тоҷикӣ"},{value:"ru",label:"Русский"},{value:"en",label:"English"}]} />
      <SelectRow label="Часовой пояс" description="Установите часовой пояс" value={settings.timezone} onChange={(value) => update("timezone", value)} options={[{value:"Asia/Dushanbe",label:"Душанбе (UTC+5)"},{value:"Asia/Tashkent",label:"Ташкент (UTC+5)"},{value:"Europe/Moscow",label:"Москва (UTC+3)"}]} />
      <SelectRow label="Формат даты" description="Выберите формат отображения даты" value={settings.dateFormat} onChange={(value) => update("dateFormat", value)} options={[{value:"DD.MM.YYYY",label:"DD.MM.YYYY"},{value:"YYYY-MM-DD",label:"YYYY-MM-DD"},{value:"MM/DD/YYYY",label:"MM/DD/YYYY"}]} />
      <SelectRow label="Формат времени" description="Выберите формат времени" value={settings.timeFormat} onChange={(value) => update("timeFormat", value)} options={[{value:"24",label:"24 часа (23:59)"},{value:"12",label:"12 часов (11:59 PM)"}]} />
      <SelectRow label="Валюта по умолчанию" description="Основная валюта системы" value={settings.currency} onChange={(value) => update("currency", value)} options={[{value:"TJS",label:"Сомони (TJS)"},{value:"USD",label:"Доллар (USD)"},{value:"RUB",label:"Рубль (RUB)"}]} />
      <SelectRow label="Единицы измерения" description="Система единиц измерения" value={settings.measurement} onChange={(value) => update("measurement", value)} options={[{value:"metric",label:"Метрическая (м, кг)"},{value:"imperial",label:"Имперская (ft, lb)"}]} />
    </SettingsCard>

    <SettingsCard icon={Monitor} title="Настройки отображения" onSave={() => onSave("Отображение")}>
      <div className="settings-block"><LabelText label="Тема интерфейса" description="Выберите тему оформления" /><div className="theme-options"><ChoiceButton active={settings.theme==="light"} onClick={() => update("theme","light")} icon={Sun} label="Светлая"/><ChoiceButton active={settings.theme==="dark"} onClick={() => update("theme","dark")} icon={Moon} label="Тёмная"/><ChoiceButton active={settings.theme==="system"} onClick={() => update("theme","system")} icon={Monitor} label="Системная"/></div></div>
      <div className="settings-block color-setting"><LabelText label="Основной цвет" description="Цветовая тема системы" /><div className="color-swatches">{["#FF5A00","#16A34A","#3182F6","#8B5CF6","#E11D48","#1595A3","#A8B1C2"].map((color) => <button type="button" aria-label={`Цвет ${color}`} key={color} style={{background:color}} className={settings.accent===color?"active":""} onClick={() => update("accent",color)}>{settings.accent===color&&<Check size={11}/>}</button>)}</div></div>
      <SegmentRow label="Плотность интерфейса" description="Размер элементов и отступы" value={settings.density} onChange={(value) => update("density",value)} items={[['compact','Компактная'],['comfortable','Удобная'],['spacious','Просторная']]} />
      <SegmentRow label="Отображение бокового меню" description="Режим отображения меню" value={settings.sidebar} onChange={(value) => update("sidebar",value)} items={[['collapsed','Сжато'],['expanded','Развернуто']]} />
      <SwitchRow label="Анимации интерфейса" description="Включить плавные анимации" checked={settings.animations} onChange={(value)=>update("animations",value)} />
    </SettingsCard>

    <SettingsCard icon={Wrench} title="Настройки работы" onSave={() => onSave("Рабочие настройки")}>
      <SwitchRow label="Автоматическое резервное копирование" description="Создавать резервные копии базы данных" checked={settings.automaticBackup} onChange={(value)=>update("automaticBackup",value)} />
      <SwitchRow label="Подтверждение удаления" description="Запрашивать подтверждение при удалении" checked={settings.confirmDelete} onChange={(value)=>update("confirmDelete",value)} />
      <SwitchRow label="Журнал действий" description="Вести журнал всех действий в системе" checked={settings.activityLog} onChange={(value)=>update("activityLog",value)} />
      <SwitchRow label="Автозавершение задач" description="Автоматически завершать просроченные задачи" checked={settings.autoCloseTasks} onChange={(value)=>update("autoCloseTasks",value)} />
      <SwitchRow label="Проверка остатков на складе" description="Контроль минимальных остатков материалов" checked={settings.stockCheck} onChange={(value)=>update("stockCheck",value)} />
    </SettingsCard>

    <SettingsCard icon={FileCog} title="Настройки документов" onSave={() => onSave("Документы")}>
      <SwitchRow label="Нумерация документов" description="Автоматическая нумерация документов" checked={settings.documentNumbering} onChange={(value)=>update("documentNumbering",value)} />
      <TextRow label="Префикс документов" description="Префикс для номеров документов" value={settings.documentPrefix} onChange={(value)=>update("documentPrefix",value)} />
      <SwitchRow label="Печатные формы" description="Использовать фирменные шаблоны" checked={settings.printForms} onChange={(value)=>update("printForms",value)} />
      <SwitchRow label="Подпись в документах" description="Автоматическая подпись в документах" checked={settings.documentSignature} onChange={(value)=>update("documentSignature",value)} />
      <SwitchRow label="Водяной знак" description="Добавлять водяной знак к документам" checked={settings.watermark} onChange={(value)=>update("watermark",value)} />
    </SettingsCard>
  </div>;
}

function CompanySettings({ settings, update, onSave }: SectionProps) { return <div className="settings-card-grid"><SettingsCard icon={Building2} title="Реквизиты компании" onSave={()=>onSave("Компания")}><TextRow label="Название компании" value={settings.companyName} onChange={(v)=>update("companyName",v)}/><TextRow label="Телефон" value={settings.companyPhone} onChange={(v)=>update("companyPhone",v)}/><TextRow label="Email" value={settings.companyEmail} onChange={(v)=>update("companyEmail",v)}/><TextRow label="Адрес" value={settings.companyAddress} onChange={(v)=>update("companyAddress",v)}/><TextRow label="ИНН" value={settings.taxId} onChange={(v)=>update("taxId",v)}/></SettingsCard><InfoPanel icon={FileText} title="Профиль компании" text="Эти данные используются в печатных формах, отчётах и экспортируемых документах."/></div>; }
function FinanceSettings({ settings, update, onSave }: SectionProps) { return <div className="settings-card-grid"><SettingsCard icon={Landmark} title="Финансовые параметры" onSave={()=>onSave("Финансы")}><SelectRow label="Основная валюта" value={settings.currency} onChange={(v)=>update("currency",v)} options={[{value:"TJS",label:"Сомони (TJS)"},{value:"USD",label:"Доллар (USD)"},{value:"RUB",label:"Рубль (RUB)"}]}/><TextRow label="Ставка НДС, %" value={settings.vatRate} onChange={(v)=>update("vatRate",v)}/><SelectRow label="Финансовый год" value={settings.fiscalYear} onChange={(v)=>update("fiscalYear",v)} options={[{value:"calendar",label:"Календарный год"},{value:"april",label:"Апрель — март"}]}/></SettingsCard><InfoPanel icon={Info} title="Форматы расчётов" text="Финансовые параметры применяются к новым сметам, бюджетам, зарплатам и отчётам."/></div>; }
function NotificationSettings({ settings, update, onSave }: SectionProps) { return <div className="settings-card-grid"><SettingsCard icon={Bell} title="Каналы уведомлений" onSave={()=>onSave("Уведомления")}><SwitchRow label="Email-уведомления" checked={settings.emailNotifications} onChange={(v)=>update("emailNotifications",v)}/><SwitchRow label="Уведомления браузера" checked={settings.browserNotifications} onChange={(v)=>update("browserNotifications",v)}/><SwitchRow label="Сроки и просрочки" checked={settings.deadlineNotifications} onChange={(v)=>update("deadlineNotifications",v)}/><SwitchRow label="Критические остатки" checked={settings.stockNotifications} onChange={(v)=>update("stockNotifications",v)}/></SettingsCard><InfoPanel icon={Bell} title="Центр уведомлений" text="Выбранные события отображаются в колокольчике и отправляются по разрешённым каналам."/></div>; }
function SecuritySettings({ settings, update, onSave }: SectionProps) { return <div className="settings-card-grid"><SettingsCard icon={ShieldCheck} title="Безопасность доступа" onSave={()=>onSave("Безопасность")}><SelectRow label="Время сессии" value={settings.sessionMinutes} onChange={(v)=>update("sessionMinutes",v)} options={[{value:"30",label:"30 минут"},{value:"60",label:"1 час"},{value:"240",label:"4 часа"},{value:"480",label:"8 часов"}]}/><SwitchRow label="Двухфакторная аутентификация" checked={settings.twoFactor} onChange={(v)=>update("twoFactor",v)}/><SwitchRow label="Срок действия паролей" checked={settings.passwordExpiry} onChange={(v)=>update("passwordExpiry",v)}/><SwitchRow label="Оповещения о входе" checked={settings.loginAlerts} onChange={(v)=>update("loginAlerts",v)}/></SettingsCard><InfoPanel icon={KeyRound} title="Политика паролей" text="Пароли не сохраняются в настройках. В production проверка выполняется сервером аутентификации."/></div>; }
function IntegrationSettings({ settings, update, onSave }: SectionProps) { return <div className="settings-card-grid"><SettingsCard icon={Link2} title="API и интеграции" onSave={()=>onSave("Интеграции")}><SwitchRow label="Доступ к API" checked={settings.apiEnabled} onChange={(v)=>update("apiEnabled",v)}/><TextRow label="API URL" value={settings.apiUrl} onChange={(v)=>update("apiUrl",v)}/><TextRow label="Webhook URL" value={settings.webhookUrl} onChange={(v)=>update("webhookUrl",v)}/><SwitchRow label="Интеграция с 1С" checked={settings.oneCEnabled} onChange={(v)=>update("oneCEnabled",v)}/><SwitchRow label="Telegram-уведомления" checked={settings.telegramEnabled} onChange={(v)=>update("telegramEnabled",v)}/></SettingsCard><InfoPanel icon={Link2} title="Статус интеграций" text="Интеграции включаются только после указания действующих адресов и серверных ключей."/></div>; }
function BackupSettings({ settings, update, onSave, download, restore }: SectionProps & {download:()=>void;restore:()=>void}) { return <div className="settings-card-grid"><SettingsCard icon={DatabaseBackup} title="Резервное копирование" onSave={()=>onSave("Резервные копии")}><SwitchRow label="Автоматические копии" checked={settings.automaticBackup} onChange={(v)=>update("automaticBackup",v)}/><SelectRow label="Периодичность" value={settings.backupFrequency} onChange={(v)=>update("backupFrequency",v)} options={[{value:"daily",label:"Ежедневно"},{value:"weekly",label:"Еженедельно"},{value:"monthly",label:"Ежемесячно"}]}/><div className="backup-actions"><Button type="button" onClick={download}><CloudDownload size={15}/>Создать копию</Button><Button type="button" variant="secondary" onClick={restore}><Upload size={15}/>Восстановить</Button></div></SettingsCard><InfoPanel icon={HardDrive} title="Локальная копия" text="Копия содержит только данные приложения из localStorage. Пароли и секретные ключи в неё не включаются."/></div>; }

interface SectionProps { settings: AppSettings; update: UpdateSetting; onSave: (section:string)=>void; }

function SettingsCard({icon:Icon,title,onSave,children}:{icon:typeof Settings2;title:string;onSave:()=>void;children:ReactNode}) { return <Card className="settings-card"><header><div><Icon size={16}/><h2>{title}</h2></div><button type="button" onClick={onSave}><Check size={13}/>Сохранить</button></header><div className="settings-card-body">{children}</div></Card>; }
function LabelText({label,description}:{label:string;description?:string}) { return <div className="setting-label"><strong>{label}</strong>{description&&<span>{description}</span>}</div>; }
function SelectRow({label,description,value,onChange,options}:{label:string;description?:string;value:string;onChange:(value:string)=>void;options:{value:string;label:string}[]}) { return <div className="setting-row"><LabelText label={label} description={description}/><CustomSelect size="sm" fullWidth value={value} onValueChange={onChange} options={options}/></div>; }
function TextRow({label,description,value,onChange}:{label:string;description?:string;value:string;onChange:(value:string)=>void}) { return <div className="setting-row"><LabelText label={label} description={description}/><input className="setting-input" value={value} onChange={(event)=>onChange(event.target.value)}/></div>; }
function SwitchRow({label,description,checked,onChange}:{label:string;description?:string;checked:boolean;onChange:(value:boolean)=>void}) { return <div className="setting-row switch-row"><LabelText label={label} description={description}/><button type="button" role="switch" aria-checked={checked} className={`setting-switch ${checked?"on":""}`} onClick={()=>onChange(!checked)}><span/></button></div>; }
function ChoiceButton({active,onClick,icon:Icon,label}:{active:boolean;onClick:()=>void;icon:typeof Sun;label:string}) { return <button type="button" className={active?"active":""} onClick={onClick}><Icon size={17}/><span>{label}</span></button>; }
function SegmentRow({label,description,value,onChange,items}:{label:string;description?:string;value:string;onChange:(value:string)=>void;items:[string,string][]}) { return <div className="setting-row segment-row"><LabelText label={label} description={description}/><div>{items.map(([key,text])=><button type="button" key={key} className={value===key?"active":""} onClick={()=>onChange(key)}>{text}</button>)}</div></div>; }
function InfoPanel({icon:Icon,title,text}:{icon:typeof Info;title:string;text:string}) { return <Card className="settings-info-panel"><Icon size={20}/><div><h2>{title}</h2><p>{text}</p></div></Card>; }

function SystemInfo({usersCount}:{usersCount:number}) {
  const storage = useMemo(()=>{let bytes=0;for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key)bytes+=key.length+(localStorage.getItem(key)?.length??0)}return Math.max(.1,bytes/1024/1024).toFixed(1)},[]);
  return <Card className="system-info-card"><header><Info size={16}/><h2>Информация о системе</h2></header><dl><div><dt>Версия системы</dt><dd>1.2.0</dd></div><div><dt>Сборка</dt><dd>2026.07.22</dd></div><div><dt>Лицензия</dt><dd><span>Активна</span></dd></div><div><dt>Тип лицензии</dt><dd>Профессиональная</dd></div><div><dt>Действует до</dt><dd>15.07.2027</dd></div><div><dt>Пользователей</dt><dd>{usersCount} из 50</dd></div></dl><div className="storage-label"><span>Место в хранилище</span><b>{storage} MB</b></div><div className="storage-bar"><span style={{width:`${Math.min(100,Number(storage)*2)}%`}}/></div><p>{storage} MB локальных данных</p></Card>;
}
function SystemActivity() { const rows=[{icon:UserRound,tone:"green",title:"Вход в систему",text:"Садди Имомов",time:"Сегодня, 09:45"},{icon:FileText,tone:"blue",title:"Создан документ",text:"Поступление PR-24",time:"Сегодня, 09:32"},{icon:FilePenLine,tone:"red",title:"Изменены данные",text:"Объект ЖК «Сомони»",time:"Сегодня, 08:15"},{icon:UserRound,tone:"red",title:"Удалён пользователь",text:"test.user",time:"Вчера, 17:45"},{icon:DatabaseBackup,tone:"green",title:"Резервное копирование",text:"База данных",time:"Вчера, 02:30"}];return <Card className="system-activity-card"><header><Clock3 size={16}/><h2>Активность системы</h2></header><div>{rows.map((row)=><article key={row.title}><span className={row.tone}><row.icon size={12}/></span><p><strong>{row.title}</strong><small>{row.text}</small></p><time>{row.time}</time></article>)}</div><button type="button">Просмотреть журнал <span>→</span></button></Card>; }

function darkenHex(hex:string){const value=hex.replace("#","");const number=parseInt(value,16);const r=Math.max(0,(number>>16)-18),g=Math.max(0,((number>>8)&255)-18),b=Math.max(0,(number&255)-18);return `#${((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1)}`;}
