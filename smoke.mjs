import { chromium } from "playwright";

const shotDir = "C:\\Users\\user\\AppData\\Local\\Temp\\claude\\c--Users-user-Desktop-BinosozCRM\\20162d90-4e2e-4653-a964-5fb5b7002ae4\\scratchpad\\shots";
import fs from "fs";
fs.mkdirSync(shotDir, { recursive: true });

const consoleErrors = [];

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push("pageerror: " + err.message));

async function shot(name) {
  await page.screenshot({ path: `${shotDir}\\${name}.png` });
  console.log("shot:", name);
}

// 1. Brigades page - the exact screenshot from the original bug report
await page.goto("http://localhost:5173/brigades", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await shot("01-brigades-page");

// Open the brigade status filter (first CustomSelect trigger, role=button, aria-haspopup=listbox)
const triggers = page.locator('[role="button"][aria-haspopup="listbox"]');
const count = await triggers.count();
console.log("CustomSelect triggers found on brigades page:", count);
if (count > 0) {
  await triggers.first().click();
  await page.waitForTimeout(300);
  await shot("02-brigades-status-dropdown-open");

  // check listbox panel is visible and styled (not native)
  const listbox = page.locator('[role="listbox"]').first();
  console.log("listbox visible:", await listbox.isVisible());

  // click an option
  const options = page.locator('[role="option"]');
  const optCount = await options.count();
  console.log("options count:", optCount);
  if (optCount > 1) {
    await options.nth(1).click();
    await page.waitForTimeout(300);
    await shot("03-brigades-status-selected");
  }
}

// keyboard nav test: open again, use ArrowDown/Enter
if (count > 0) {
  await triggers.first().focus();
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(200);
  await shot("04-keyboard-open");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  await shot("05-keyboard-select");
  // Escape test
  await triggers.first().click();
  await page.waitForTimeout(200);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  const openAfterEscape = await page.locator('[role="listbox"]').count();
  console.log("listbox count after Escape (should be 0):", openAfterEscape);
}

// 2. Test a searchable select - Object filter on brigades page (3rd select)
if (count >= 3) {
  await triggers.nth(2).click();
  await page.waitForTimeout(300);
  const searchInput = page.locator('[role="listbox"] input[role="combobox"]');
  console.log("search input present:", await searchInput.count());
  if (await searchInput.count() > 0) {
    await searchInput.fill("zzzznonexistent");
    await page.waitForTimeout(300);
    await shot("06-search-empty-state");
    await searchInput.fill("");
  }
  await page.keyboard.press("Escape");
}

// 3. Open a modal with a form CustomSelect - Works page "Add work" modal
await page.goto("http://localhost:5173/works", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await shot("07-works-page");
const addBtn = page.locator('button:has-text("Добавить")').first();
if (await addBtn.count() > 0) {
  await addBtn.click();
  await page.waitForTimeout(400);
  await shot("08-work-modal-open");
  const modalTriggers = page.locator('[role="dialog"] [role="button"][aria-haspopup="listbox"]');
  const modalCount = await modalTriggers.count();
  console.log("selects inside work modal:", modalCount);
  if (modalCount > 0) {
    await modalTriggers.first().click();
    await page.waitForTimeout(300);
    await shot("09-work-modal-select-open");
    // check the panel isn't clipped - check its bounding box vs modal bounding box
    const panel = page.locator('[role="listbox"]').first();
    const panelBox = await panel.boundingBox();
    console.log("dropdown panel box inside modal:", JSON.stringify(panelBox));
    await page.keyboard.press("Escape");
  }
}

// 4. mobile viewport test
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://localhost:5173/brigades", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await shot("10-mobile-brigades");
const mobileTriggers = page.locator('[role="button"][aria-haspopup="listbox"]');
if (await mobileTriggers.count() > 0) {
  await mobileTriggers.first().click();
  await page.waitForTimeout(300);
  await shot("11-mobile-dropdown-open");
}

console.log("CONSOLE_ERRORS:", JSON.stringify(consoleErrors, null, 2));

await browser.close();
