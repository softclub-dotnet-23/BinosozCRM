import { chromium } from "playwright";

const dir = "C:\\Users\\user\\AppData\\Local\\Temp\\claude\\c--Users-user-Desktop-BinosozCRM\\af4d16bc-8f64-47a1-b347-f264f7789fcc\\scratchpad\\";
const shot = (n) => dir + n + ".png";

async function main() {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 375, height: 900 } });
  page.setDefaultTimeout(10000);

  await page.goto("http://localhost:5173/login", { waitUntil: "domcontentloaded" });
  await page.fill('input[placeholder="Введите логин"]', "shakhrom.mirzoev");
  await page.fill('input[placeholder="Введите пароль"]', "brigadir123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|brigades)/, { timeout: 15000 });

  await page.goto("http://localhost:5173/reports", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Обзор", { timeout: 15000 });
  await page.waitForTimeout(700);
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(400);
  await page.screenshot({ path: shot("v2-09-mobile-mid") });
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(400);
  await page.screenshot({ path: shot("v2-10-mobile-bottom") });

  await browser.close();
}

main().then(() => process.exit(0)).catch((e) => { console.error("FAILED", e); process.exit(1); });
