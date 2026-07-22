import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://localhost:5173/login", { waitUntil: "networkidle" });
await page.getByPlaceholder(/логин|username|login/i).first().fill("sadi.imomov");
await page.getByPlaceholder(/пароль|password/i).first().fill("owner123");
await page.keyboard.press("Enter");
await page.waitForURL("**/dashboard", { timeout: 15000 });
await page.goto("http://localhost:5173/attendance", { waitUntil: "networkidle" });
await page.waitForTimeout(700);

const culprits = await page.evaluate(() => {
  const docWidth = document.documentElement.clientWidth;

  function isWithinScrollableAncestor(el) {
    let node = el.parentElement;
    while (node) {
      const style = getComputedStyle(node);
      if (["auto", "scroll"].includes(style.overflowX) && node.scrollWidth > node.clientWidth) return true;
      node = node.parentElement;
    }
    return false;
  }

  const all = Array.from(document.querySelectorAll("body *"));
  const offenders = [];
  for (const el of all) {
    const rect = el.getBoundingClientRect();
    if (rect.right > docWidth + 2 && rect.left >= -1 && rect.width > 0) {
      if (isWithinScrollableAncestor(el)) continue;
      offenders.push({
        tag: el.tagName,
        cls: el.className?.toString().slice(0, 140),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        text: el.textContent?.trim().slice(0, 50),
      });
    }
  }
  return { docWidth, scrollWidth: document.documentElement.scrollWidth, offenders: offenders.slice(0, 20) };
});
console.log(JSON.stringify(culprits, null, 2));
await browser.close();
