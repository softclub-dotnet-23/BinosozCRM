import { expect, test } from "@playwright/test";

const accounts = {
  owner: { phone: "+992900000001" },
  prorab: { phone: "+992900000002" },
  brigadir: { phone: "+992900000003" },
  accountant: { phone: "+992900000004" },
} as const;

async function login(page: import("@playwright/test").Page, account: keyof typeof accounts) {
  await page.goto("/login");
  await page.getByLabel(/телефон/i).fill(accounts[account].phone);
  await page.getByLabel(/пароль/i).fill("Demo12345!");
  await page.getByRole("button", { name: /войти/i }).click();
  await expect(page).toHaveURL(/dashboard|works|brigades|payroll/);
}

test("rejects an invalid password without a refresh loop", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/телефон/i).fill(accounts.owner.phone);
  await page.getByLabel(/пароль/i).fill("incorrect-password");
  await page.getByRole("button", { name: /войти/i }).click();
  await expect(page.getByText(/неверн|данные/i)).toBeVisible();
  await expect(page).toHaveURL(/login/);
});

test("Owner has real navigation and Administrator label", async ({ page }) => {
  await login(page, "owner");
  await expect(page.getByText("Администратор")).toBeVisible();
  for (const label of ["Объекты", "Работы", "Сотрудники", "Посещаемость", "Зарплаты", "Отчёты", "Пользователи", "Настройки"]) await expect(page.getByRole("link", { name: label })).toBeVisible();
  await page.getByRole("link", { name: "Настройки" }).click();
  await expect(page.getByText(/Настройки компании/i)).toBeVisible();
});

test("Prorab cannot see Owner-only navigation", async ({ page }) => {
  await login(page, "prorab");
  await expect(page.getByRole("link", { name: "Пользователи" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Настройки" })).toHaveCount(0);
  await page.getByRole("link", { name: "Работы" }).click();
  await expect(page.getByText(/наряд|работ/i).first()).toBeVisible();
});

test("Brigadir sees only the scoped web workflow", async ({ page }) => {
  await login(page, "brigadir");
  await page.getByRole("link", { name: "Моя бригада" }).click();
  await expect(page.getByText(/Моя бригада/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Зарплаты" })).toHaveCount(0);
  await page.getByRole("link", { name: "Материалы" }).click();
  await expect(page.getByText(/Заявка на материалы/i)).toBeVisible();
});

test("Accountant has read-only operational navigation and payroll", async ({ page }) => {
  await login(page, "accountant");
  await page.getByRole("link", { name: "Зарплаты" }).click();
  await expect(page.getByText(/зарплат/i).first()).toBeVisible();
  await page.getByRole("link", { name: "Объекты" }).click();
  await expect(page.getByRole("button", { name: /создать объект/i })).toHaveCount(0);
});