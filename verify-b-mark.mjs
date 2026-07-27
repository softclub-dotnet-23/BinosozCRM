import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
const errors = [];
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
page.on("pageerror", (err) => errors.push(String(err)));

await page.goto("http://localhost:5174/login");
await page.fill('input[type="text"]', "shakhrom.mirzoev");
await page.fill('input[type="password"]', "brigadir123");
await page.click('button[type="submit"]');
await page.waitForURL(/brigades/, { timeout: 10000 });
await page.waitForTimeout(500);

const outDir = "C:\\Users\\user\\AppData\\Local\\Temp\\claude\\c--Users-user-Desktop-BinosozCRM\\a2c7f578-b51f-4c73-83ac-246a80b9f318\\scratchpad";
await page.screenshot({ path: outDir + "/bmark-sidebar-crop.png", clip: { x: 0, y: 0, width: 220, height: 100 } });

const logoEl = page.locator("aside img").first();
await logoEl.screenshot({ path: outDir + "/bmark-logo-element.png" });

const sw = await page.evaluate(() => document.documentElement.scrollWidth);
const cw = await page.evaluate(() => document.documentElement.clientWidth);
console.log("overflow check:", sw > cw ? "OVERFLOW" : "OK");
console.log("Console errors:", JSON.stringify(errors, null, 2));

await browser.close();
