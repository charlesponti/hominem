import { expect, test, type Page } from '@playwright/test';

async function startChat(page: Page, message: string) {
  await page.goto('/chats');
  await page.getByRole('button', { name: 'Start a new chat' }).click();
  const composer = page.getByRole('textbox', { name: 'Chat message' });
  await composer.fill(message);
  const requestPromise = page.waitForRequest(
    (request) => request.method() === 'POST' && request.url().endsWith('/stream'),
  );
  await page.getByRole('button', { name: 'Submit' }).click();
  const request = await requestPromise;
  const body = JSON.parse(request.postData() ?? '{}') as { generationId?: string };
  if (!body.generationId) throw new Error('Generation request did not include a generation ID');
  return body.generationId;
}

test.describe.configure({ mode: 'serial' });

test('B-011 cancels before provider execution', async ({ page }) => {
  await startChat(page, 'B011-CANCEL-BEFORE');
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.getByText('Stopped.')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Scripted response: B011-CANCEL-BEFORE')).toHaveCount(0);
});

test('B-012 stops a delayed stream without false success', async ({ page }) => {
  await startChat(page, 'B012-STREAM');
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.getByText('Stopped.')).toBeVisible({ timeout: 10_000 });
});

test('B-013 recovers after active-generation reload', async ({ page }) => {
  await startChat(page, 'B013-DISCONNECT');
  await page.waitForTimeout(250);
  await page.reload();
  await expect(page.getByText('Scripted response: B013-DISCONNECT')).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText('Scripted response: B013-DISCONNECT')).toHaveCount(1);
});

test('B-014 keeps delayed replay state single after reload', async ({ page }) => {
  await startChat(page, 'B014-REPLAY');
  await page.waitForTimeout(250);
  await page.reload();
  await expect(page.getByText('Scripted response: B014-REPLAY')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Scripted response: B014-REPLAY')).toHaveCount(1);
});
