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
  // The date range is a pair of native <input type="date"> fields (see
  // @ponti-studios/ui's DatePicker) rather than a single trigger button —
  // there's no calendar popover to open, so wait on the field itself.
  await expect(page.locator('input[name="startDate"]')).toBeVisible();
}

test('stores and shows dates without a UTC date shift', async ({ page }) => {
  const id = await createEngagement(page, { startDate: '2020-01-15', endDate: '2020-06-30' });
  await openEditor(page);

  // In a negative-UTC timezone these used to render as Jan 14 / Jun 29.
  await expect(page.locator('input[name="startDate"]')).toHaveValue('2020-01-15');
  await expect(page.locator('input[name="endDate"]')).toHaveValue('2020-06-30');

  await deleteEngagement(page, id);
});

test('a picked range persists after save', async ({ page }) => {
  const id = await createEngagement(page, { startDate: '2020-01-15', endDate: '2020-06-30' });
  await openEditor(page);

  await page.locator('input[name="startDate"]').fill('2020-01-10');
  await page.locator('input[name="endDate"]').fill('2020-01-20');
  await expect(page.locator('input[name="startDate"]')).toHaveValue('2020-01-10');
  await expect(page.locator('input[name="endDate"]')).toHaveValue('2020-01-20');

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

  await deleteEngagement(page, id);
});

test('current role clears the end date and persists isCurrent', async ({ page }) => {
  const id = await createEngagement(page, { startDate: '2020-01-15', endDate: '2020-06-30' });
  await openEditor(page);

  await page.getByRole('switch').click();
  await expect(page.locator('input[name="endDate"]')).toHaveValue('');

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

  await deleteEngagement(page, id);
});
