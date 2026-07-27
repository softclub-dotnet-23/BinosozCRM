import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppLayout } from "../components/layout/AppLayout";
import { useToast } from "../hooks/useToast";
import { cn } from "../utils/cn";
import {
  UsersIcon,
  ClipboardIcon,
  CheckIcon,
  BoxIcon,
  BuildingIcon,
  BoltIcon,
  WallIcon,
  ClockIcon,
  AlertIcon,
  PlusIcon,
  UserIcon,
  CalendarIcon,
  MoreIcon,
  tone,
  Card,
  CardHeader,
  Badge,
  ProgressBar,
  KpiCard,
} from "../components/brigadir/shared";

const team=[
 ["Абдуллоев Бахтиёр","Арматурщик","На объекте","08:05","abdulloev-bakhtiyor.jpg","green"],
 ["Юсупов Далер","Плотник","На объекте","07:58","daler-yusupov.jpg","green"],
 ["Рустамов Комрон","Мастер","Опоздание","08:20","rustamov-komron.jpg","orange"],
 ["Темуров Фирӯз","Подсобный рабочий","Отсутствует","—","firuz-rakhmonov.jpg","red"],
] as const;
const works=[
 ["Заливка фундамента","ЖК «Сомон»","В работе","blue",BuildingIcon,68],
 ["Электромонтаж","Бизнес-центр «Ватан»","Нужна проверка","orange",BoltIcon,0],
 ["Кладка стен","Школа №25","По графику","green",WallIcon,0],
 ["Подготовка материалов","Коттедж «Наврӯз»","Срочно","red",BoxIcon,0],
] as const;
const chartData=[{day:"1 июл",plan:24,fact:18},{day:"6 июл",plan:27,fact:20},{day:"11 июл",plan:25,fact:19},{day:"16 июл",plan:29,fact:27},{day:"21 июл",plan:32,fact:23},{day:"26 июл",plan:34,fact:26},{day:"31 июл",plan:36,fact:30}];
const materials=[
 ["Арматура Ø12 — 120 м","Запрошено: 16 июля","Ожидает","orange",ClockIcon],
 ["Цемент М400 — 20 мешков","Запрошено: 15 июля","Подтверждено","green",CheckIcon],
 ["Песок — 5 м³","Запрошено: 14 июля","Нужно срочно","red",AlertIcon],
] as const;

export default function BrigadirDashboardPage(){
 const navigate=useNavigate(); const {showToast}=useToast(); const [period,setPeriod]=useState("Месяц"); const [search,setSearch]=useState("");
 const visibleTeam=team.filter(r=>`${r[0]} ${r[1]} ${r[2]}`.toLowerCase().includes(search.toLowerCase()));
 const visibleWorks=works.filter(r=>`${r[0]} ${r[1]} ${r[2]}`.toLowerCase().includes(search.toLowerCase()));
 const periodData=period==="Неделя"?chartData.slice(-4):period==="Квартал"?chartData.map(x=>({...x,plan:x.plan+6,fact:x.fact+5})):chartData;
 return <AppLayout title="Панель бригадира" subtitle="Контроль бригады, посещаемости и выполнения работ" titleBelowHeader contentMaxWidth="1280px" search={{value:search,onChange:setSearch,placeholder:"Поиск..."}}>
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
   <KpiCard label="Состав бригады сегодня" value="12 человек" note="10 на объекте · 2 отсутствуют" color="blue" icon={UsersIcon}/>
   <KpiCard label="Назначенные работы" value="5" note="3 в работе · 1 на проверке · 1 срочная" color="orange" icon={ClipboardIcon}/>
   <KpiCard label="Посещаемость" value="92%" note="За сегодня" color="green" icon={CheckIcon}/>
   <KpiCard label="Запросы материалов" value="3" note="2 ожидают · 1 подтвержден" color="orange" icon={BoxIcon}/>
  </div>
  <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[.92fr_1.28fr]">
   <Card className="overflow-hidden"><CardHeader>Моя бригада</CardHeader><div className="table-scroll-x overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-slate-50 text-[10px] font-semibold text-ink-muted"><th className="whitespace-nowrap px-3 py-2.5">Сотрудник</th><th className="whitespace-nowrap px-1.5">Должность</th><th className="whitespace-nowrap px-1.5">Статус</th><th className="whitespace-nowrap px-2">Приход</th></tr></thead><tbody>{visibleTeam.map(r=><tr key={r[0]} className="border-t border-border hover:bg-orange-50/40"><td className="px-3 py-2.5"><div className="flex items-center gap-1.5"><img src={`/images/people/${r[4]}`} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover"/><span className="whitespace-nowrap text-[11px] font-semibold">{r[0]}</span></div></td><td className="whitespace-nowrap px-1.5 text-[10px] text-ink-secondary">{r[1]}</td><td className="whitespace-nowrap px-1.5"><Badge color={r[5]}>{r[2]}</Badge></td><td className="whitespace-nowrap px-2 text-[10px] text-ink-secondary">{r[3]}</td></tr>)}</tbody></table></div><button onClick={()=>navigate("/brigades")} className="flex w-full items-center justify-between border-t border-border px-5 py-3 text-[11px] font-bold text-primary hover:bg-primary-soft"><span>Показать всех сотрудников</span><span>→</span></button></Card>
   <Card className="overflow-hidden"><CardHeader>Работы на сегодня</CardHeader><div className="divide-y divide-border px-4">{visibleWorks.map(([name,obj,status,color,Icon,progress])=><div key={name} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2.5 sm:grid-cols-[auto_1fr_130px_82px]"><div className={cn("flex h-9 w-9 items-center justify-center rounded-full",tone[color])}><Icon size={19}/></div><div><p className="text-[11px] font-bold">{name}</p><p className="text-[9px] text-ink-muted">{obj}</p></div><div className="hidden sm:block"><Badge color={color}>{status}</Badge>{progress>0&&<><p className="mt-1 text-[9px] text-ink-secondary">{progress}%</p><ProgressBar value={progress}/></>}</div><button onClick={()=>navigate("/works",{state:{work:name}})} className="rounded-lg border border-primary/60 px-3 py-1.5 text-[10px] font-bold text-primary hover:bg-primary hover:text-white">Открыть</button></div>)}</div></Card>
  </div>
  <div className="mt-3 grid grid-cols-1 items-start gap-3 lg:grid-cols-[1.38fr_.82fr]">
   <Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-[15px] font-bold">Прогресс работ бригады</h2><div className="flex rounded-lg border border-border p-0.5">{["Неделя","Месяц","Квартал"].map(x=><button key={x} onClick={()=>setPeriod(x)} className={cn("rounded-md px-3 py-1.5 text-[10px] font-semibold",period===x?"bg-primary-soft text-primary":"text-ink-muted")}>{x}</button>)}</div></div><div className="mt-4 grid gap-4 lg:grid-cols-[1fr_110px]"><div className="h-[235px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={periodData} barGap={5} margin={{top:10,right:4,left:-20,bottom:0}}><CartesianGrid vertical={false} stroke="#e5e7eb"/><XAxis dataKey="day" tick={{fontSize:9,fill:"#64748b"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:9,fill:"#64748b"}} axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="plan" name="План" fill="#1e3a5f" radius={[3,3,0,0]} maxBarSize={14}/><Bar dataKey="fact" name="Факт" fill="#f97316" radius={[3,3,0,0]} maxBarSize={14}/></BarChart></ResponsiveContainer></div><div className="grid grid-cols-2 gap-2 lg:grid-cols-1">{[["План работ","24","text-ink"],["Выполнено","19","text-green"],["Осталось","5","text-warning"],["Просрочено","1","text-red"]].map(([a,b,c])=><div key={a} className="rounded-lg border border-border p-2.5"><p className="text-[9px] text-ink-muted">{a}</p><b className={cn("mt-1 block text-xl",c)}>{b}</b></div>)}</div></div><div className="mt-2 flex justify-center gap-5 text-[10px] text-ink-secondary"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-[#1e3a5f]"/>План</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-orange-500"/>Факт</span></div></Card>
   <div className="grid gap-3"><Card className="overflow-hidden"><CardHeader>Материалы и заявки</CardHeader><div className="divide-y divide-border px-4">{materials.map(([name,date,status,color,StatusIcon])=><div key={name} className="flex items-center gap-3 py-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"><BoxIcon size={16}/></div><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold">{name}</p><p className="text-[9px] text-ink-muted">{date}</p></div><Badge color={color}>{status}</Badge><StatusIcon size={16} className={tone[color].split(" ")[1]}/></div>)}</div><div className="grid grid-cols-2 gap-2 border-t border-border p-3"><button onClick={()=>navigate("/inventory/materials")} className="flex items-center justify-center gap-1 rounded-lg bg-primary py-2 text-[9px] font-bold text-white"><PlusIcon size={13}/>Создать заявку</button><button onClick={()=>showToast("Проблема отправлена прорабу","info")} className="flex items-center justify-center gap-1 rounded-lg border border-primary/60 text-[9px] font-bold text-primary"><AlertIcon size={13}/>Сообщить о проблеме</button></div></Card>
   <Card className="p-4"><div className="flex items-center justify-between"><h2 className="text-[14px] font-bold">Краткая сводка</h2><MoreIcon size={17} className="text-ink-muted"/></div><div className="mt-3 divide-y divide-border">{[[BuildingIcon,"Объект:","ЖК «Сомон»"],[UserIcon,"Прораб:","Комрон Саидов"],[CalendarIcon,"Следующая проверка:","20 июля"],[AlertIcon,"Замечания:","2"]].map(([Icon,a,b],i)=><div key={String(a)} className="flex items-center gap-2 py-2 text-[10px]"><Icon size={14} className="text-ink-muted"/><span className="text-ink-secondary">{a as string}</span><b className={cn("ml-auto",i===3&&"text-red")}>{b as string}</b></div>)}</div></Card></div>
  </div>
 </AppLayout>
}
