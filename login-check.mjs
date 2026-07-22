import { chromium } from "playwright";
import fs from "fs";

const shotDir = "C:\\Users\\user\\AppData\\Local\\Temp\\claude\\c--Users-user-Desktop-BinosozCRM\\20162d90-4e2e-4653-a964-5fb5b7002ae4\\scratchpad\\login-shots";
fs.mkdirSync(shotDir, { recursive: true });
const BASE = "http://localhost:5173";

const allErrors = [];
function trackErrors(page, label) {
  page.on("console", (msg) => { if (msg.type() === "error") allErrors.push(`[${label}] console: ${msg.text()}`); });
  page.on("pageerror", (err) => allErrors.push(`[${label}] pageerror: ${err.message}`));
  page.on("requestfailed", (req) => {
    if (!req.url().includes("favicon")) allErrors.push(`[${label}] requestfailed: ${req.url()} ${req.failure()?.errorText}`);
  });
}

function check(label, cond) {
  console.log(`${cond ? "PASS" : "FAIL"} - ${label}`);
}

const browser = await chromium.launch({ args: ["--no-sandbox"] });

// ============ Fresh context: unauthenticated behavior ============
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  trackErrors(page, "unauth");

  // 1. Unauthenticated visit to a protected route redirects to /login
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  check("unauth /dashboard redirects to /login", page.url().endsWith("/login"));
  await page.screenshot({ path: `${shotDir}\\01-login-page.png` });

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("no horizontal overflow on /login desktop", overflow <= 0);

  // 2. No role-selector text anywhere
  const bodyText = await page.evaluate(() => document.body.innerText);
  check("no visible 'Войти как бригадир'", !bodyText.includes("Войти как бригадир"));
  check("no visible 'Войти как прораб'", !bodyText.includes("Войти как прораб"));

  // 3. Empty submit -> validation errors + focus first invalid field
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(200);
  const loginErrorVisible = await page.locator("#login-error").isVisible().catch(() => false);
  check("empty submit shows login-required error", loginErrorVisible);
  const focusedId = await page.evaluate(() => document.activeElement?.id);
  check("focus moves to login field on empty submit", focusedId === "login-input");
  await page.screenshot({ path: `${shotDir}\\02-empty-validation.png` });

  // 4. Wrong credentials
  await page.fill("#login-input", "sadi.imomov");
  await page.fill("#password-input", "wrongpassword");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(700);
  const wrongCredsError = await page.locator('[role="alert"]:has-text("Неверный логин или пароль")').isVisible().catch(() => false);
  check("wrong password shows generic invalid-credentials error", wrongCredsError);
  const loginPreserved = await page.inputValue("#login-input");
  check("login value preserved after failed auth", loginPreserved === "sadi.imomov");
  const passwordCleared = await page.inputValue("#password-input");
  check("password cleared after failed auth", passwordCleared === "");
  await page.screenshot({ path: `${shotDir}\\03-wrong-credentials.png` });

  // 5. Unknown login (must show same generic message, not reveal existence)
  await page.fill("#login-input", "nosuchuser");
  await page.fill("#password-input", "whatever");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(700);
  const unknownUserError = await page.locator('[role="alert"]:has-text("Неверный логин или пароль")').isVisible().catch(() => false);
  check("unknown login shows same generic error (no enumeration)", unknownUserError);

  // 6. Inactive account
  await page.fill("#login-input", "inactive.demo");
  await page.fill("#password-input", "demo123");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(700);
  const inactiveError = await page.locator('[role="alert"]:has-text("Учётная запись неактивна")').isVisible().catch(() => false);
  check("inactive account shows inactive-specific error", inactiveError);
  await page.screenshot({ path: `${shotDir}\\04-inactive-account.png` });

  // 7. Blocked account
  await page.fill("#login-input", "blocked.demo");
  await page.fill("#password-input", "demo123");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(700);
  const blockedError = await page.locator('[role="alert"]:has-text("Доступ к системе ограничен")').isVisible().catch(() => false);
  check("blocked account shows blocked-specific error", blockedError);

  // 8. Password visibility toggle
  await page.fill("#password-input", "secret123");
  const typeBefore = await page.getAttribute("#password-input", "type");
  await page.click('button[aria-label="Показать пароль"]');
  const typeAfter = await page.getAttribute("#password-input", "type");
  check("password visibility toggle works", typeBefore === "password" && typeAfter === "text");
  await page.screenshot({ path: `${shotDir}\\05-password-visible.png` });
  await page.click('button[aria-label="Скрыть пароль"]');

  // 9. Duplicate submit protection: click twice fast, only one request cycle (button disabled while submitting)
  await page.fill("#login-input", "sadi.imomov");
  await page.fill("#password-input", "owner123");
  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.click();
  await page.waitForTimeout(50);
  const disabledDuringSubmit = await submitBtn.isDisabled();
  check("submit button disabled while submitting (duplicate-submit guard)", disabledDuringSubmit);
  await page.waitForTimeout(600);

  // 10. Successful owner login -> redirect to /dashboard, sidebar shows real name/role
  check("owner login redirects to /dashboard", page.url().endsWith("/dashboard"));
  await page.waitForTimeout(300);
  const ownerName = await page.locator("aside p:has-text('Садди Имомов')").first().isVisible().catch(() => false);
  check("sidebar shows real owner name", ownerName);
  await page.screenshot({ path: `${shotDir}\\06-owner-dashboard.png` });

  // 11. Authenticated visit to /login redirects away
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  check("authenticated visit to /login redirects away", !page.url().endsWith("/login"));

  // 12. Logout via sidebar
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await page.locator('aside button:has-text("Выйти")').click();
  await page.waitForTimeout(400);
  check("logout redirects to /login", page.url().endsWith("/login"));

  // 13. After logout, protected route is blocked again
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  check("after logout, /dashboard redirects to /login again", page.url().endsWith("/login"));

  await ctx.close();
}

// ============ Prorab login + role redirect + role-restricted nav ============
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  trackErrors(page, "prorab");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#login-input", "firuz.rakhmonov");
  await page.fill("#password-input", "prorab123");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(700);
  check("prorab login redirects to /works", page.url().endsWith("/works"));
  const prorabName = await page.locator("aside p:has-text('Фируз Рахмонов')").first().isVisible().catch(() => false);
  check("sidebar shows real prorab name", prorabName);
  const prorabRole = await page.locator("aside p:has-text('Прораб')").first().isVisible().catch(() => false);
  check("sidebar shows Прораб role label", prorabRole);

  // Users/Settings nav items should not be visible for prorab
  const usersLinkVisible = await page.locator('aside a:has-text("Пользователи")').isVisible().catch(() => false);
  check("prorab sidebar hides Пользователи", !usersLinkVisible);
  const settingsLinkVisible = await page.locator('aside a:has-text("Настройки")').isVisible().catch(() => false);
  check("prorab sidebar hides Настройки", !settingsLinkVisible);
  await page.screenshot({ path: `${shotDir}\\07-prorab-works.png` });

  // Attempt to open /users directly -> bounced back to role home
  await page.goto(`${BASE}/users`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  check("prorab manually opening /users gets redirected away", !page.url().endsWith("/users"));
  await page.screenshot({ path: `${shotDir}\\08-prorab-blocked-users.png` });

  await ctx.close();
}

// ============ Brigadir login + redirect ============
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  trackErrors(page, "brigadir");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#login-input", "shakhrom.mirzoev");
  await page.fill("#password-input", "brigadir123");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(700);
  check("brigadir login redirects to /brigades", page.url().endsWith("/brigades"));
  await page.screenshot({ path: `${shotDir}\\09-brigadir-brigades.png` });

  await page.goto(`${BASE}/payroll`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  check("brigadir manually opening /payroll gets redirected away", !page.url().endsWith("/payroll"));

  await ctx.close();
}

// ============ Accountant login + payroll role wiring ============
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  trackErrors(page, "accountant");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#login-input", "mekhriniso.karimova");
  await page.fill("#password-input", "buh123");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(700);
  check("accountant login redirects to /payroll", page.url().endsWith("/payroll"));
  const noDemoRoleSwitcher = await page.locator('[aria-label="Роль"]').count();
  check("payroll page no longer shows demo role switcher", noDemoRoleSwitcher === 0);
  const accountantName = await page.locator("aside p:has-text('Мехринисо Каримова')").first().isVisible().catch(() => false);
  check("sidebar shows real accountant name", accountantName);
  await page.screenshot({ path: `${shotDir}\\10-accountant-payroll.png` });
  await ctx.close();
}

// ============ Remember-me: session-only (no localStorage) ============
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  trackErrors(page, "remember-off");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.locator('input[type="checkbox"]').uncheck();
  await page.fill("#login-input", "sadi.imomov");
  await page.fill("#password-input", "owner123");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(700);
  const inLocal = await page.evaluate(() => Object.keys(localStorage).some((k) => k.includes("auth-session")));
  const inSession = await page.evaluate(() => Object.keys(sessionStorage).some((k) => k.includes("auth-session")));
  check("remember-me OFF: session stored in sessionStorage not localStorage", !inLocal && inSession);

  // refresh should keep the session within the same tab
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  check("session survives refresh even without remember-me (same tab)", page.url().endsWith("/dashboard"));
  await ctx.close();
}

// ============ Remember-me: persisted in localStorage ============
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  trackErrors(page, "remember-on");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  const rememberChecked = await page.locator('input[type="checkbox"]').isChecked();
  check("remember-me is checked by default", rememberChecked);
  await page.fill("#login-input", "sadi.imomov");
  await page.fill("#password-input", "owner123");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(700);
  const inLocal = await page.evaluate(() => Object.keys(localStorage).some((k) => k.includes("auth-session")));
  check("remember-me ON: session stored in localStorage", inLocal);
  await ctx.close();
}

// ============ Forgot password + QR modals ============
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  trackErrors(page, "modals");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });

  await page.click('button:has-text("Забыли пароль?")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${shotDir}\\11-forgot-password-modal.png` });
  // submit empty -> validation
  await page.locator('div[role="dialog"] button:has-text("Отправить")').click();
  await page.waitForTimeout(200);
  const forgotError = await page.locator("#forgot-password-error").isVisible().catch(() => false);
  check("forgot-password empty submit shows validation error", forgotError);
  await page.fill("#forgot-password-input", "sadi.imomov");
  await page.locator('div[role="dialog"] button:has-text("Отправить")').click();
  await page.waitForTimeout(700);
  const neutralMsgVisible = await page.locator("text=демо-версии").isVisible().catch(() => false);
  check("forgot-password shows neutral demo-mode message", neutralMsgVisible);
  await page.screenshot({ path: `${shotDir}\\12-forgot-password-success.png` });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  const modalClosedAfterEscape = await page.locator('div[role="dialog"]').count();
  check("Escape closes forgot-password modal", modalClosedAfterEscape === 0);

  await page.click('button:has-text("Войти через QR-код")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${shotDir}\\13-qr-modal.png` });
  const qrExplains = await page.locator("text=backend-интеграции").isVisible().catch(() => false);
  check("QR modal explains it needs backend integration (no fake success)", qrExplains);
  await page.keyboard.press("Escape");

  await ctx.close();
}

// ============ Language switching ============
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  trackErrors(page, "language");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  const langTrigger = page.locator('[aria-label="Язык интерфейса"]');
  await langTrigger.click();
  await page.waitForTimeout(300);
  await page.locator('[role="option"]:has-text("English")').click();
  await page.waitForTimeout(300);
  const englishVisible = await page.locator("text=Welcome back!").isVisible().catch(() => false);
  check("switching language updates labels immediately", englishVisible);
  await page.screenshot({ path: `${shotDir}\\14-english.png` });

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const stillEnglish = await page.locator("text=Welcome back!").isVisible().catch(() => false);
  check("language persists after refresh", stillEnglish);

  await ctx.close();
}

// ============ Enter-key submission ============
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  trackErrors(page, "enter-key");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#login-input", "sadi.imomov");
  await page.fill("#password-input", "owner123");
  await page.locator("#password-input").press("Enter");
  await page.waitForTimeout(700);
  check("Enter key submits the form", page.url().endsWith("/dashboard"));
  await ctx.close();
}

// ============ Responsive: tablet & mobile ============
{
  const ctx = await browser.newContext({ viewport: { width: 834, height: 1112 } });
  const page = await ctx.newPage();
  trackErrors(page, "tablet");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const tabletOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("no horizontal overflow on tablet", tabletOverflow <= 0);
  await page.screenshot({ path: `${shotDir}\\15-tablet-login.png` });
  await ctx.close();
}
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  trackErrors(page, "mobile");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("no horizontal overflow on mobile", mobileOverflow <= 0);
  const submitVisible = await page.locator('button[type="submit"]').isVisible();
  check("submit button visible on mobile", submitVisible);
  await page.screenshot({ path: `${shotDir}\\16-mobile-login.png` });
  await ctx.close();
}

console.log("\n=== ERRORS COLLECTED ===");
console.log(allErrors.length === 0 ? "none" : JSON.stringify(allErrors, null, 2));

await browser.close();
