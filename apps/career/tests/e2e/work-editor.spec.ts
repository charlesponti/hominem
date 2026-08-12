import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const ID_RE = /\/work\/([0-9a-f-]{36})$/;

/**
 * Create an engagement through the real /work/new form. The range
 * DateField's hidden inputs are set directly on the DOM so we control the
 * exact stored dates (the browser serializes the form's DOM state on
 * submit, so this is equivalent to picking them in the calendar).
 */
async function createEngagement(page: Page, dates: { startDate: string; endDate: string }) {
  await page.goto('/work/new');
  await page.getByLabel('Company *').fill('Playwright Test Co');
  await page.getByLabel('Title *').fill('E2E Engineer');
  await page.evaluate(({ startDate, endDate }) => {
    const start = document.querySelector('input[name="startDate"]');
    const end = document.querySelector('input[name="endDate"]');
    if (start instanceof HTMLInputElement) start.value = startDate;
    if (end instanceof HTMLInputElement) end.value = endDate;
  }, dates);
  await Promise.all([
    page.waitForURL(ID_RE),
    page.getByRole('button', { name: 'Create engagement' }).click(),
  ]);
  return page.url().match(ID_RE)![1];
}

async function deleteEngagement(page: Page, id: string) {
  await page.evaluate(async (eid) => {
    const fd = new FormData();
    fd.set('intent', 'delete');
    await fetch(`/work/${eid}`, { method: 'POST', body: fd });
  }, id);
}

async function openEditor(page: Page) {
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByRole('button', { name: 'Dates' })).toBeVisible();
}

test('stores and shows dates without a UTC date shift', async ({ page }) => {
  const id = await createEngagement(page, { startDate: '2020-01-15', endDate: '2020-06-30' });
  await openEditor(page);

  // In a negative-UTC timezone these used to render as Jan 14 / Jun 29.
  await expect(page.locator('input[name="startDate"]')).toHaveValue('2020-01-15');
  await expect(page.locator('input[name="endDate"]')).toHaveValue('2020-06-30');
  const trigger = page.getByRole('button', { name: 'Dates' });
  await expect(trigger).toHaveText(/Jan 15, 2020/);
  await expect(trigger).toHaveText(/Jun 30, 2020/);

  await deleteEngagement(page, id);
});

test('calendar opens on the start month and a picked range persists after save', async ({
  page,
}) => {
  const id = await createEngagement(page, { startDate: '2020-01-15', endDate: '2020-06-30' });
  await openEditor(page);

  const trigger = page.getByRole('button', { name: 'Dates' });
  await trigger.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  // The picker must open on the range's start month, not the current month.
  await expect(dialog.getByRole('button', { name: /January 10th, 2020/ })).toBeVisible();

  await dialog.getByRole('button', { name: /January 10th, 2020/ }).click();
  await dialog.getByRole('button', { name: /January 20th, 2020/ }).click();
  await expect(page.locator('input[name="startDate"]')).toHaveValue('2020-01-10');
  await expect(page.locator('input[name="endDate"]')).toHaveValue('2020-01-20');

  // Close the popover, then save and wait for the form POST to actually fire.
  await page.keyboard.press('Escape');
  const save = page.getByRole('button', { name: 'Save position' });
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes(`/work/${id}`)),
    save.click(),
  ]);

  // Reload so the loader re-reads the database; the new range must survive.
  await page.goto(`/work/${id}`);
  await openEditor(page);
  await expect(page.locator('input[name="startDate"]')).toHaveValue('2020-01-10');
  await expect(page.locator('input[name="endDate"]')).toHaveValue('2020-01-20');
  await expect(page.getByRole('button', { name: 'Dates' })).toHaveText(/Jan 10, 2020/);
  await expect(page.getByRole('button', { name: 'Dates' })).toHaveText(/Jan 20, 2020/);

  await deleteEngagement(page, id);
});

test('current role clears the end date and persists isCurrent', async ({ page }) => {
  const id = await createEngagement(page, { startDate: '2020-01-15', endDate: '2020-06-30' });
  await openEditor(page);

  await page.getByRole('switch').click();
  await expect(page.locator('input[name="endDate"]')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Dates' })).toHaveText(/From Jan 15, 2020/);

  const save = page.getByRole('button', { name: 'Save position' });
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes(`/work/${id}`)),
    save.click(),
  ]);

  // The detail view must show the Current badge after a reload.
  await page.goto(`/work/${id}`);
  await expect(page.getByText('Current')).toBeVisible();
  await openEditor(page);
  await expect(page.locator('input[name="startDate"]')).toHaveValue('2020-01-15');
  await expect(page.locator('input[name="endDate"]')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Dates' })).toHaveText(/From Jan 15, 2020/);

  await deleteEngagement(page, id);
});
