import { expect, test } from "@playwright/test";

const accounts = {
  owner: { phone: "+992900000001" },
  prorab: { phone: "+992900000002" },
  brigadir: { phone: "+992900000003" },
  accountant: { phone: "+992900000004" },
} as const;

async function openNavigation(page: import("@playwright/test").Page) {
  if ((page.viewportSize()?.width ?? 1280) < 1024)
    await page.getByRole("button", { name: "Открыть меню" }).click();
}

function navigationLink(page: import("@playwright/test").Page, name: string) {
  return page.locator("aside").getByRole("link", { name });
}

async function login(page: import("@playwright/test").Page, account: keyof typeof accounts) {
  await page.goto("/login");
  await page.getByLabel(/телефон/i).fill(accounts[account].phone);
  await page.getByRole("textbox", { name: "Пароль" }).fill("Demo12345!");
  await page.getByRole("button", { name: "Войти в систему" }).click();
  await expect(page).toHaveURL(/dashboard|works|brigades|payroll/);
}

test("rejects an invalid password without a refresh loop", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/телефон/i).fill("+992999999999");
  await page.getByRole("textbox", { name: "Пароль" }).fill("incorrect-password");
  await page.getByRole("button", { name: "Войти в систему" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/login/);
});

test("Owner has real navigation and Administrator label", async ({ page }) => {
  await login(page, "owner");
  await openNavigation(page);
  await expect(page.locator("p:visible").filter({ hasText: "Администратор" })).toBeVisible();
  for (const label of ["Объекты", "Работы", "Сотрудники", "Посещаемость", "Зарплаты", "Отчёты", "Пользователи", "Настройки"])
    await expect(navigationLink(page, label)).toBeVisible();
  const settings = navigationLink(page, "Настройки");
  await settings.scrollIntoViewIfNeeded();
  await settings.click();
  await expect(page.getByText(/Настройки компании/i)).toBeVisible();
});

test("Prorab cannot see Owner-only navigation", async ({ page }) => {
  await login(page, "prorab");
  await openNavigation(page);
  await expect(page.getByRole("link", { name: "Пользователи" })).toHaveCount(0);
  await expect(navigationLink(page, "Настройки")).toHaveCount(0);
  const works = navigationLink(page, "Работы");
  await works.scrollIntoViewIfNeeded();
  await works.click();
  await expect(page.getByText(/наряд|работ/i).first()).toBeVisible();
});

test("Brigadir sees only the scoped web workflow", async ({ page }) => {
  await login(page, "brigadir");
  await openNavigation(page);
  const brigade = navigationLink(page, "Моя бригада");
  await brigade.scrollIntoViewIfNeeded();
  await brigade.click();
  await expect(page.getByRole("heading", { name: "Моя бригада" })).toBeVisible();
  await expect(navigationLink(page, "Зарплаты")).toHaveCount(0);
  await openNavigation(page);
  const materials = navigationLink(page, "Материалы");
  await materials.scrollIntoViewIfNeeded();
  await materials.click();
  await expect(page.getByText(/Заявка на материалы/i)).toBeVisible();
});

test("Accountant has read-only operational navigation and payroll", async ({ page }) => {
  await login(page, "accountant");
  await openNavigation(page);
  const payroll = navigationLink(page, "Зарплаты");
  await payroll.scrollIntoViewIfNeeded();
  await payroll.click();
  await expect(page.getByText(/зарплат/i).first()).toBeVisible();
  await openNavigation(page);
  const objects = navigationLink(page, "Объекты");
  if ((page.viewportSize()?.width ?? 1280) < 1024) {
    await page.locator("aside nav").evaluate((navigation) => { navigation.scrollTop = 0; });
    await objects.scrollIntoViewIfNeeded();
  }
  await objects.click();
  await expect(page.getByRole("button", { name: /создать объект/i })).toHaveCount(0);
});
