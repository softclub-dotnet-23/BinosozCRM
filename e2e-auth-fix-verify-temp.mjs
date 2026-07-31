import { chromium } from "playwright";
const BASE = "http://localhost:5173";
const results = [];
function log(label, ok, detail = "") {
  results.push({ label, ok, detail });
  console.log(`${ok ? "OK  " : "FAIL"} ${label}${detail ? " - " + detail : ""}`);
}

async function freshPage(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const requests = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/v1/")) requests.push({ method: req.method(), url: req.url() });
  });
  return { ctx, page, requests };
}

async function login(page, loginValue, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  await page.locator("#login-input").fill(loginValue);
  await page.locator("#password-input").fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(1500);
}

async function run() {
  const browser = await chromium.launch();

  // ===== SCENARIO 1: mock admin =====
  {
    const { ctx, page, requests } = await freshPage(browser);
    await login(page, "admin", "admin123");
    log("Mock admin login succeeds", !page.url().includes("/login"), page.url());

    requests.length = 0;
    await page.goto(`${BASE}/material-requests`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    const materialRequestCalls = requests.filter((r) => r.url.includes("material-requests"));
    log("Mock session: no GET /material-requests fired", materialRequestCalls.length === 0, JSON.stringify(materialRequestCalls));

    const bodyText = await page.locator("body").innerText();
    log("Mock session shows 'requires real backend login' text", bodyText.includes("Требуется вход через реальную backend-учётную запись"), "");
    log("Mock session shows 'Перейти ко входу' button", bodyText.includes("Перейти ко входу"), "");
    log("Mock session page is NOT blank (has real content)", bodyText.trim().length > 200, `len=${bodyText.trim().length}`);

    // Confirm clicking through doesn't crash and user isn't auto-logged-out from just viewing
    await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    log("Mock session still logged in after visiting gated page", !page.url().includes("/login"), page.url());

    await ctx.close();
  }

  // ===== SCENARIO 2: real Owner =====
  {
    const { ctx, page, requests } = await freshPage(browser);
    await login(page, "+992900000001", "NewDevPass123!ChangeMe");
    const loggedIn = !page.url().includes("/login");
    log("Real Owner login succeeds", loggedIn, page.url());

    if (loggedIn) {
      requests.length = 0;
      const [resp] = await Promise.all([
        page.waitForResponse((r) => r.url().includes("/material-requests") && r.request().method() === "GET", { timeout: 8000 }).catch(() => null),
        page.goto(`${BASE}/material-requests`, { waitUntil: "domcontentloaded" }),
      ]);
      await page.waitForTimeout(800);
      log("Real Owner: GET /material-requests returned 200", resp?.status() === 200, `status=${resp?.status()}`);
      const bodyText = await page.locator("body").innerText();
      log("Real Owner: material-requests page shows list/empty state, not permission error", !bodyText.includes("Backend не предоставляет"), "");

      const [resp2] = await Promise.all([
        page.waitForResponse((r) => r.url().includes("/material-deliveries") && r.request().method() === "GET", { timeout: 8000 }).catch(() => null),
        page.goto(`${BASE}/material-deliveries`, { waitUntil: "domcontentloaded" }),
      ]);
      await page.waitForTimeout(800);
      log("Real Owner: GET /material-deliveries returned 200", resp2?.status() === 200, `status=${resp2?.status()}`);
    }
    await ctx.close();
  }

  // ===== SCENARIO 3: real Prorab =====
  {
    const { ctx, page } = await freshPage(browser);
    await login(page, "+992900000011", "NewDevPass123!ChangeMe");
    const loggedIn = !page.url().includes("/login");
    log("Real Prorab login succeeds", loggedIn, page.url());

    if (loggedIn) {
      const [resp] = await Promise.all([
        page.waitForResponse((r) => r.url().includes("/material-requests") && r.request().method() === "GET", { timeout: 8000 }).catch(() => null),
        page.goto(`${BASE}/material-requests`, { waitUntil: "domcontentloaded" }),
      ]);
      log("Real Prorab: GET /material-requests returned 200", resp?.status() === 200, `status=${resp?.status()}`);

      const [resp2] = await Promise.all([
        page.waitForResponse((r) => r.url().includes("/material-deliveries") && r.request().method() === "GET", { timeout: 8000 }).catch(() => null),
        page.goto(`${BASE}/material-deliveries`, { waitUntil: "domcontentloaded" }),
      ]);
      log("Real Prorab: GET /material-deliveries returned 200", resp2?.status() === 200, `status=${resp2?.status()}`);
    }
    await ctx.close();
  }

  // ===== SCENARIO 4: real Brigadir =====
  {
    const { ctx, page, requests } = await freshPage(browser);
    await login(page, "+992900000021", "NewDevPass123!ChangeMe");
    const loggedIn = !page.url().includes("/login");
    log("Real Brigadir login succeeds", loggedIn, page.url());

    if (loggedIn) {
      requests.length = 0;
      await page.goto(`${BASE}/material-requests`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1200);
      const listGetCalls = requests.filter((r) => r.method === "GET" && r.url.includes("/material-requests") && !r.url.includes("material-requests/"));
      log("Real Brigadir: forbidden GET /material-requests NOT sent", listGetCalls.length === 0, JSON.stringify(listGetCalls));

      const bodyText = await page.locator("body").innerText();
      log("Real Brigadir: create-request button visible", bodyText.includes("Новая заявка"), "");
    }
    await ctx.close();
  }

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
}
run().catch((e) => { console.error("FATAL:", e); process.exit(1); });
