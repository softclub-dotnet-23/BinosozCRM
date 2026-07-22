import { chromium } from "playwright";

const BASE = "http://localhost:5173";
const shotDir = "C:/Users/user/AppData/Local/Temp/claude/c--Users-user-Desktop-BinosozCRM/a2c7f578-b51f-4c73-83ac-246a80b9f318/scratchpad";
const errors = [];
const failedRequests = [];

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (msg) => { if (msg.type() === "error") errors.push(`[${page.url()}] ${msg.text()}`); });
page.on("pageerror", (err) => errors.push(`[${page.url()}] pageerror: ${err.message}`));
page.on("response", (res) => { if (res.status() >= 400 && !res.url().includes("fonts.gstatic.com")) failedRequests.push(`${res.url()} - HTTP ${res.status()}`); });

async function shot(name) { await page.screenshot({ path: `${shotDir}/${name}.png`, fullPage: true }); }

// ==== 1) DATA INTEGRITY VIA THE APP'S OWN REPOSITORY (evaluated in-page, real localStorage data) ====
console.log("=== LOGIN as brigadir ===");
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.getByPlaceholder(/логин|username|login/i).first().fill("shakhrom.mirzoev");
await page.getByPlaceholder(/пароль|password/i).first().fill("brigadir123");
await page.keyboard.press("Enter");
await page.waitForURL("**/brigades", { timeout: 15000 });

console.log("=== Reading raw attendance + employees from localStorage for integrity checks ===");
const integrity = await page.evaluate(() => {
  const attendance = JSON.parse(localStorage.getItem("binosoz:attendance.v1") || "[]");
  const employees = JSON.parse(localStorage.getItem("binosoz:employees.v1") || "[]");
  const validNames = new Set(employees.map((e) => e.fullName));
  const invalidRefs = attendance.filter((a) => !validNames.has(a.employeeName));
  const seen = new Set();
  const duplicates = [];
  for (const a of attendance) {
    const key = `${a.employeeName}|${a.date}`;
    if (seen.has(key)) duplicates.push(key);
    seen.add(key);
  }
  const statusCounts = attendance.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});
  const brigade1Crew = employees.filter((e) => e.brigadeName === "Бригада №1").map((e) => e.fullName);
  const brigade1WithAttendance = new Set(attendance.filter((a) => a.brigadeName === "Бригада №1").map((a) => a.employeeName));
  const brigade1Missing = brigade1Crew.filter((n) => !brigade1WithAttendance.has(n));
  return {
    totalAttendance: attendance.length,
    totalEmployees: employees.length,
    invalidRefCount: invalidRefs.length,
    invalidRefSamples: invalidRefs.slice(0, 5).map((a) => a.employeeName),
    duplicateCount: duplicates.length,
    duplicateSamples: duplicates.slice(0, 5),
    statusCounts,
    brigade1CrewCount: brigade1Crew.length,
    brigade1WithAttendanceCount: brigade1WithAttendance.size,
    brigade1Missing,
  };
});
console.log(JSON.stringify(integrity, null, 2));

// ==== 2) BRIGADIR: Dashboard / My Crew / Attendance ====
for (const p of ["/dashboard", "/brigades", "/attendance"]) {
  await page.goto(`${BASE}${p}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await shot(`v2-brigadir-${p.replace("/", "")}`);
}

await page.goto(`${BASE}/brigades`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
const crewRowCount = await page.locator("table tbody tr").count();
console.log("=== My Crew table row count (expect 13):", crewRowCount);

// ==== 3) Open a couple of individual attendance histories via Attendance page detail drawer ====
await page.goto(`${BASE}/attendance`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
const rowCountAttendance = await page.locator("table tbody tr").count();
console.log("=== Brigadir Attendance visible rows (this page, unpaginated list):", rowCountAttendance);
if (rowCountAttendance > 0) {
  await page.locator("table tbody tr").first().click();
  await page.waitForTimeout(400);
  await shot("v2-brigadir-attendance-detail");
  await page.keyboard.press("Escape");
}

// ==== 4) Mark/edit attendance, refresh, confirm persistence ====
await page.getByRole("button", { name: /Отметить посещение/i }).click();
await page.waitForTimeout(400);
const uniqueNote = `RECON-TEST-${Date.now()}`;
await page.locator('input[type="date"]').fill("2026-07-29");
await page.locator('input[type="time"]').first().fill("08:00");
await page.locator('input[type="time"]').nth(1).fill("17:00");
await page.getByPlaceholder(/Опоздал на 10 мин/i).fill(uniqueNote);
await page.getByRole("button", { name: "Сохранить" }).click();
await page.waitForTimeout(500);
const savedVisible = (await page.textContent("body"))?.includes(uniqueNote);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(500);
const persistedAfterReload = (await page.textContent("body"))?.includes(uniqueNote);
console.log("=== New record visible right after save:", savedVisible, " | after reload:", persistedAfterReload);

// ==== 5) Filters + reset ====
const filterButtons = await page.getByRole("button", { name: /Присутствуют|Опоздания|Отсутствуют/i }).all();
if (filterButtons.length > 0) {
  await filterButtons[1].click();
  await page.waitForTimeout(300);
  await shot("v2-brigadir-attendance-filtered");
}

// ==== 6) Login as OWNER: confirm same record appears, test full filters/reset ====
await page.evaluate(() => { localStorage.removeItem("binosoz:auth-session"); sessionStorage.clear(); });
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.getByPlaceholder(/логин|username|login/i).first().fill("sadi.imomov");
await page.getByPlaceholder(/пароль|password/i).first().fill("owner123");
await page.keyboard.press("Enter");
await page.waitForURL("**/dashboard", { timeout: 15000 });

await page.goto(`${BASE}/attendance`, { waitUntil: "networkidle" });
await page.waitForTimeout(700);
await shot("v2-owner-attendance");
const ownerBodyText = await page.textContent("body");
console.log("=== Owner Attendance page sees the new record:", ownerBodyText?.includes(uniqueNote));
console.log("=== Owner Attendance page sees Мирзоев Шахром:", ownerBodyText?.includes("Мирзоев Шахром"));

// Test employee filter dropdown - search for our brigadir
const employeeFilterTrigger = page.locator("button, [role=combobox]").filter({ hasText: /Сотрудник/i }).first();
console.log("=== Employee filter control present:", (await employeeFilterTrigger.count()) > 0);

// Reset filters button
const resetBtn = page.getByRole("button", { name: /Сбросить/i }).first();
if ((await resetBtn.count()) > 0) {
  await resetBtn.click();
  await page.waitForTimeout(300);
  console.log("=== Reset filters clicked OK");
}

// ==== 7) Payroll ====
await page.goto(`${BASE}/payroll`, { waitUntil: "networkidle" });
await page.waitForTimeout(700);
const payrollBody = await page.textContent("body");
console.log("=== Payroll page loaded, contains NaN/undefined:", /\bNaN\b|\bundefined\b/.test(payrollBody || ""));
await shot("v2-owner-payroll");

// ==== 8) Reports ====
await page.goto(`${BASE}/reports`, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
const reportsBody = await page.textContent("body");
console.log("=== Reports page loaded, contains NaN/undefined:", /\bNaN\b|\bundefined\b/.test(reportsBody || ""));
await shot("v2-owner-reports");

// ==== 9) Responsive checks on Attendance page ====
console.log("=== RESPONSIVE CHECKS ===");
const viewports = [{ w: 1920, h: 1080, name: "desktop" }, { w: 834, h: 1194, name: "tablet" }, { w: 390, h: 844, name: "mobile" }];
for (const vp of viewports) {
  await page.setViewportSize({ width: vp.w, height: vp.h });
  await page.goto(`${BASE}/attendance`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  console.log(`   attendance @ ${vp.name}: overflow=${overflow}`);
  await shot(`v2-owner-attendance-${vp.name}`);
}
await page.setViewportSize({ width: 1920, height: 1080 });

// ==== 10) Broken images check ====
await page.goto(`${BASE}/attendance`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
const brokenImages = await page.evaluate(() => Array.from(document.images).filter((img) => !img.complete || img.naturalWidth === 0).length);
console.log("=== Broken images on Owner Attendance:", brokenImages);

console.log("\n=== CONSOLE ERRORS TOTAL:", errors.length, "===");
for (const e of errors.slice(0, 20)) console.log("ERR:", e);
console.log("=== FAILED REQUESTS TOTAL:", failedRequests.length, "===");
for (const f of failedRequests.slice(0, 20)) console.log("NET:", f);

await browser.close();
