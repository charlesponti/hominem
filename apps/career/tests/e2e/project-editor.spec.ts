import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const ID_RE = /\/projects\/([0-9a-f-]{36})$/;

// The date range is a pair of native <input type="date"> fields (see
// @ponti-studios/ui's DatePicker) rather than a "Dates" trigger button with
// a calendar popover — there's no calendar UI to drive, so set values
// directly on the fields.
async function fillDateRange(page: Page, startDate: string, endDate: string) {
  await page.locator('input[name="startDate"]').fill(startDate);
  await page.locator('input[name="endDate"]').fill(endDate);
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

  // Wait for full React hydration: in Vite dev mode, React may still be
  // reconciling the SSR HTML when the page appears ready. A fill before
  // hydration is complete gets wiped when React takes over the DOM. Retry
  // until the fill value sticks — this is the reliable hydration signal
  // (same race already worked around in tests/auth.flow-helpers.ts).
  const titleInput = page.getByLabel('Title');
  await titleInput.waitFor({ state: 'visible' });
  await expect(async () => {
    await titleInput.fill(projectTitle);
    await expect(titleInput).toHaveValue(projectTitle);
  }).toPass({ timeout: 20_000 });

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
  await expect(page.locator('input[name="startDate"]')).toHaveValue(initialDates.startDate);
  await expect(page.locator('input[name="endDate"]')).toHaveValue(initialDates.endDate);

  await fillDateRange(page, updatedDates.startDate, updatedDates.endDate);
  await expect(page.locator('input[name="startDate"]')).toHaveValue(updatedDates.startDate);
  await expect(page.locator('input[name="endDate"]')).toHaveValue(updatedDates.endDate);

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

  await page.evaluate(async (pid) => {
    const fd = new FormData();
    fd.set('intent', 'delete');
    await fetch(`/projects/${pid}`, { method: 'POST', body: fd });
  }, id);
});
