import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const ID_RE = /\/projects\/([0-9a-f-]{36})$/;

function calendarDayLabel(dateInput: string) {
  const [year, month, day] = dateInput.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const ordinal =
    day % 10 === 1 && day !== 11
      ? 'st'
      : day % 10 === 2 && day !== 12
        ? 'nd'
        : day % 10 === 3 && day !== 13
          ? 'rd'
          : 'th';
  return `${date.toLocaleString('en-US', { month: 'long' })} ${day}${ordinal}, ${year}`;
}

async function selectCalendarDate(dialog: Locator, dateInput: string) {
  const day = dialog.getByRole('button', { name: new RegExp(calendarDayLabel(dateInput)) });
  await expect(day).toBeVisible();
  await day.click();
}

async function fillDateRange(page: Page, startDate: string, endDate: string) {
  await page.getByRole('button', { name: 'Dates' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await selectCalendarDate(dialog, startDate);
  await selectCalendarDate(dialog, endDate);
  await page.keyboard.press('Escape');
}

function dateInputForDay(day: number) {
  const date = new Date();
  date.setDate(day);
  return [date.getFullYear(), date.getMonth() + 1, day]
    .map((value, index) => (index === 0 ? String(value) : String(value).padStart(2, '0')))
    .join('-');
}

async function createProject(page: Page) {
  const projectTitle = `Playwright E2E Project ${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  await page.goto('/projects/new');
  await page.getByLabel('Title').fill(projectTitle);
  await Promise.all([
    page.waitForURL(/\/projects$/),
    page.getByRole('button', { name: 'Add project' }).click(),
  ]);
  const href = await page
    .getByRole('link', { name: projectTitle, exact: true })
    .getAttribute('href');
  const id = href!.match(ID_RE)![1];
  await page.goto(`/projects/${id}`);
  return id;
}

test('project range picker shows stored dates and persists a picked range', async ({ page }) => {
  const id = await createProject(page);
  const initialDates = { startDate: dateInputForDay(5), endDate: dateInputForDay(15) };
  const updatedDates = { startDate: dateInputForDay(10), endDate: dateInputForDay(20) };

  await page.getByRole('button', { name: 'Edit' }).click();
  await fillDateRange(page, initialDates.startDate, initialDates.endDate);
  await Promise.all([
    page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.url().includes(`/projects/${id}`),
    ),
    page.getByRole('button', { name: 'Save project' }).click(),
  ]);

  await page.goto(`/projects/${id}`);
  await page.getByRole('button', { name: 'Edit' }).click();
  const trigger = page.getByRole('button', { name: 'Dates' });
  await expect(trigger).toHaveText(/\w+ 5, \d{4}/);
  await expect(trigger).toHaveText(/\w+ 15, \d{4}/);
  await expect(page.locator('input[name="startDate"]')).toHaveValue(initialDates.startDate);
  await expect(page.locator('input[name="endDate"]')).toHaveValue(initialDates.endDate);

  await fillDateRange(page, updatedDates.startDate, updatedDates.endDate);
  await expect(page.locator('input[name="startDate"]')).toHaveValue(updatedDates.startDate);
  await expect(page.locator('input[name="endDate"]')).toHaveValue(updatedDates.endDate);

  await page.keyboard.press('Escape');
  const save = page.getByRole('button', { name: 'Save project' });
  await Promise.all([
    page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.url().includes(`/projects/${id}`),
    ),
    save.click(),
  ]);

  await page.goto(`/projects/${id}`);
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('input[name="startDate"]')).toHaveValue(updatedDates.startDate);
  await expect(page.locator('input[name="endDate"]')).toHaveValue(updatedDates.endDate);
  await expect(page.getByRole('button', { name: 'Dates' })).toHaveText(/\w+ 10, \d{4}/);
  await expect(page.getByRole('button', { name: 'Dates' })).toHaveText(/\w+ 20, \d{4}/);

  await page.evaluate(async (pid) => {
    const fd = new FormData();
    fd.set('intent', 'delete');
    await fetch(`/projects/${pid}`, { method: 'POST', body: fd });
  }, id);
});
