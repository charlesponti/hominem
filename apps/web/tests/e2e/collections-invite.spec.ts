import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';

const apiUrl = process.env.API_URL ?? 'https://api.lvh.me:4200';
const runId = Date.now().toString(36).toUpperCase();
const collaboratorEmail =
  process.env.E2E_COLLABORATOR_USER_EMAIL ?? 'e2e-collaborator@test.hakumi.io';
const collaboratorAuthPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../.auth/collaborator-user.json',
);

test.describe.configure({ mode: 'serial' });

function apiPath(pathname: string) {
  return `${apiUrl}/api${pathname}`;
}

let collaboratorContext: BrowserContext;
let collaboratorPage: Page;
let collectionId: string;
const collectionName = `Invite Test ${runId}`;

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  collaboratorContext = await browser.newContext({ storageState: collaboratorAuthPath });
  collaboratorPage = await collaboratorContext.newPage();
});

test.afterAll(async ({ request }) => {
  if (collectionId) {
    await request.delete(apiPath(`/collections/${collectionId}`)).catch(() => {});
  }
  await collaboratorContext.close();
});

test('owner creates a collection and invites a collaborator', async ({ page }) => {
  await page.goto('/collections');
  await page.getByRole('button', { name: 'New collection' }).click();
  await page.getByPlaceholder('Lake Arrowhead').fill(collectionName);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/collections\/[0-9a-f-]{36}$/);
  collectionId = new URL(page.url()).pathname.split('/').at(-1) ?? '';
  expect(collectionId).toMatch(/^[0-9a-f-]{36}$/);

  const inviteDialog = page.getByRole('dialog', { name: 'Invite a collaborator' });
  await page.getByRole('button', { name: 'Invite' }).click();
  await expect(inviteDialog).toBeVisible();
  await inviteDialog.getByPlaceholder('name@example.com').fill(collaboratorEmail);
  await inviteDialog.locator('[data-slot="select-trigger"]').click();
  await page.getByRole('option', { name: 'Editor' }).click();
  const inviteResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === `/api/collections/${collectionId}/members`,
  );
  await page.getByRole('button', { name: 'Send invite' }).click();
  const inviteResponse = await inviteResponsePromise;
  expect(inviteResponse.ok()).toBeTruthy();

  await expect(page.getByText('Collaborators · 2 members')).toBeVisible();
  await expect(page.getByText(collaboratorEmail)).toBeVisible();
  await expect(page.getByText('Pending')).toBeVisible();
});

test('collaborator sees and accepts the invite from notifications', async () => {
  await collaboratorPage.goto('/collections');
  await collaboratorPage.getByRole('button', { name: 'Open account menu' }).click();
  await expect(collaboratorPage.getByText(collectionName)).toBeVisible();
  await expect(collaboratorPage.getByText('invited you as editor')).toBeVisible();

  const acceptResponsePromise = collaboratorPage.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === `/api/collections/invites/${collectionId}/accept`,
  );
  await collaboratorPage.getByRole('button', { name: 'Accept' }).click();
  const acceptResponse = await acceptResponsePromise;
  expect(acceptResponse.ok()).toBeTruthy();
  await expect(collaboratorPage.getByText('Accepted')).toBeVisible();

  await collaboratorPage.keyboard.press('Escape');
  await collaboratorPage.reload();
  await expect(
    collaboratorPage.getByRole('link', { name: new RegExp(collectionName) }),
  ).toBeVisible();
});

test('member without owner permissions cannot edit or delete the collection', async () => {
  await collaboratorPage.goto(`/collections/${collectionId}`);
  await expect(collaboratorPage.getByRole('heading', { name: collectionName })).toBeVisible();

  await expect(collaboratorPage.getByRole('button', { name: 'Edit collection' })).toHaveCount(0);
  await expect(collaboratorPage.getByRole('button', { name: 'Delete collection' })).toHaveCount(0);
  await expect(collaboratorPage.getByRole('button', { name: 'Invite' })).toHaveCount(0);
  await expect(collaboratorPage.getByRole('button', { name: 'Leave' })).toBeVisible();

  // Defense in depth: the UI hides the controls, but the server must reject
  // the operation outright even if a request is crafted directly.
  const hijackResponse = await collaboratorPage.request.patch(
    apiPath(`/collections/${collectionId}`),
    {
      data: { name: 'Hijacked by a non-owner' },
    },
  );
  expect(hijackResponse.status()).toBe(404);

  const deleteResponse = await collaboratorPage.request.delete(
    apiPath(`/collections/${collectionId}`),
  );
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- matches every RPC hook in this codebase
  const deleteBody = (await deleteResponse.json()) as { deleted?: boolean };
  expect(deleteBody.deleted).toBe(false);

  await collaboratorPage.reload();
  await expect(collaboratorPage.getByRole('heading', { name: collectionName })).toBeVisible();
});
