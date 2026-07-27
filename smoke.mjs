import { chromium } from "playwright";

const dir = "C:\\Users\\user\\AppData\\Local\\Temp\\claude\\c--Users-user-Desktop-BinosozCRM\\af4d16bc-8f64-47a1-b347-f264f7789fcc\\scratchpad\\";
const shot = (n) => dir + n + ".png";

async function main() {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  page.setDefaultTimeout(10000);
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto("http://localhost:5173/login", { waitUntil: "domcontentloaded" });
  await page.fill('input[placeholder="Введите логин"]', "shakhrom.mirzoev");
  await page.fill('input[placeholder="Введите пароль"]', "brigadir123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|brigades)/, { timeout: 15000 });

  await page.goto("http://localhost:5173/reports", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Обзор", { timeout: 15000 });
  await page.waitForTimeout(900); // let count-up + chart animations settle
  await page.screenshot({ path: shot("v2-01-overview") });

  // check for NaN / undefined / Infinity anywhere in the KPI/summary text
  const bodyText = await page.evaluate(() => document.body.innerText);
  const badTokens = ["NaN", "undefined", "Infinity", "null"];
  const found = badTokens.filter((t) => bodyText.includes(t));
  console.log("bad tokens found:", JSON.stringify(found));

  // verify status percentages sum to 100 and match total works count
  const statusText = await page.locator("text=Распределение работ по статусам").locator("..").innerText();
  console.log("STATUS BLOCK:\n", statusText);

  // change date range to a narrower window and confirm KPIs recompute (not equal to before)
  const totalBefore = await page.locator("text=Всего работ").first().locator("..").locator("p.text-xl").first().innerText().catch(() => "n/a");
  console.log("total works before date change:", totalBefore);

  await page.fill('input[type="date"] >> nth=0', "2026-07-10");
  await page.waitForTimeout(900);
  await page.screenshot({ path: shot("v2-02-date-changed") });

  const bodyText2 = await page.evaluate(() => document.body.innerText);
  const found2 = badTokens.filter((t) => bodyText2.includes(t));
  console.log("bad tokens found after date change:", JSON.stringify(found2));

  // reset date
  await page.fill('input[type="date"] >> nth=0', "2026-07-01");
  await page.waitForTimeout(500);

  // switch tabs
  for (const label of ["Работы", "Материалы", "Финансы", "Бригада", "Посещаемость", "Обзор"]) {
    await page.locator(`button:has-text("${label}")`).first().click();
    await page.waitForTimeout(250);
  }
  await page.screenshot({ path: shot("v2-03-back-to-overview") });

  // finance tab check
  await page.locator('button:has-text("Финансы")').first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot("v2-04-finance") });
  await page.locator('button:has-text("Обзор")').first().click();
  await page.waitForTimeout(300);

  // click "Все объекты" / "Подробнее о расходах" links
  await page.locator('button:has-text("Все объекты")').first().click();
  await page.waitForTimeout(300);
  await page.locator('button:has-text("Подробнее о расходах")').first().click();
  await page.waitForTimeout(300);
  console.log("URL after expenses link:", page.url());
  await page.screenshot({ path: shot("v2-05-expenses-link-target") });
  await page.locator('button:has-text("Обзор")').first().click();
  await page.waitForTimeout(300);

  // reduced motion: emulate and reload, verify animation still functionally correct (no crash) & AnimatedNumber shows final values immediately
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: shot("v2-06-reduced-motion") });
  const bodyText3 = await page.evaluate(() => document.body.innerText);
  console.log("bad tokens with reduced motion:", JSON.stringify(badTokens.filter((t) => bodyText3.includes(t))));
  await page.emulateMedia({ reducedMotion: "no-preference" });

  // mobile check
  await page.setViewportSize({ width: 375, height: 900 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: shot("v2-07-mobile") });
  const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  console.log("mobile overflow check:", JSON.stringify(overflow), overflow.scrollWidth > overflow.clientWidth + 1);

  console.log("ERRORS:", JSON.stringify(errors));
  await browser.close();
}

main().then(() => process.exit(0)).catch((e) => { console.error("FAILED", e); process.exit(1); });
