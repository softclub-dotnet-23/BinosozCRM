import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:5173/login", { waitUntil: "networkidle" });
await page.getByPlaceholder(/логин|username|login/i).first().fill("sadi.imomov");
await page.getByPlaceholder(/пароль|password/i).first().fill("owner123");
await page.keyboard.press("Enter");
await page.waitForURL("**/dashboard", { timeout: 15000 });
await page.goto("http://localhost:5173/attendance", { waitUntil: "networkidle" });
await page.waitForTimeout(700);

console.log("=== Search for Мирзоев Шахром via the header search box ===");
await page.getByPlaceholder(/Поиск по сотрудникам/i).fill("Мирзоев Шахром");
await page.waitForTimeout(500);
const rows = await page.locator("table tbody tr").count();
console.log("   rows after search:", rows);
const bodyText = await page.textContent("body");
console.log("   'Мирзоев Шахром' present after search:", bodyText?.includes("Мирзоев Шахром"));
console.log("   'Показано' summary line:", bodyText?.match(/Показано[^\n]{0,60}/)?.[0]);

console.log("\n=== Employee filter dropdown options (sidebar CustomSelect) ===");
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(600);
const selects = await page.locator("button").filter({ hasText: /Все сотрудники|Все статусы|Все бригады|Все объекты/i }).all();
console.log("   filter selects found:", selects.length);
if (selects.length > 0) {
  await selects[0].click();
  await page.waitForTimeout(300);
  const optionsText = await page.evaluate(() => document.body.innerText);
  console.log("   dropdown open, contains 'Мирзоев Шахром':", optionsText.includes("Мирзоев Шахром"));
  console.log("   dropdown open, contains 'Рустам Саидов':", optionsText.includes("Рустам Саидов"));
}

console.log("\n=== Reports attendance section values ===");
await page.goto("http://localhost:5173/reports", { waitUntil: "networkidle" });
await page.waitForTimeout(900);
const reportsText = await page.textContent("body");
console.log("   Reports mentions 'Посещаемость':", reportsText?.includes("Посещаемость"));

console.log("\n=== Payroll attendance-driven values sanity ===");
await page.goto("http://localhost:5173/payroll", { waitUntil: "networkidle" });
await page.waitForTimeout(700);
const payrollText = await page.textContent("body");
console.log("   Payroll body length:", payrollText?.length);

await browser.close();
