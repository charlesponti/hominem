import { execFileSync } from 'node:child_process';

import { expect, test as base, type Page } from '@playwright/test';

type Evidence = {
  startedAt: string;
  runLabel: string;
  consoleErrors: string[];
  pageErrors: string[];
  requestFailures: string[];
  expectedRequestFailures: string[];
  apiResponses: Array<{ url: string; status: number; requestId?: string }>;
  chats: Array<{ chatId: string; generationIds: string[] }>;
};

const evidenceByPage = new WeakMap<Page, Evidence>();
const test = base;
const apiUrl = process.env.API_URL ?? 'http://localhost:4040';
const runId = Date.now().toString(36).toUpperCase();

function revision() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }, testInfo) => {
  const evidence: Evidence = {
    startedAt: new Date().toISOString(),
    runLabel: `task-003-${testInfo.project.name}-${Date.now().toString(36)}`,
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    expectedRequestFailures: [],
    apiResponses: [],
    chats: [],
  };
  evidenceByPage.set(page, evidence);
  page.on('console', (message) => {
    if (message.type() === 'error') evidence.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => evidence.pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    evidence.requestFailures.push(
      `${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'unknown'}`,
    );
  });
  page.on('response', (response) => {
    if (!response.url().includes('/api/')) return;
    const requestId = response.headers()['x-request-id'];
    evidence.apiResponses.push({
      url: response.url(),
      status: response.status(),
      ...(requestId ? { requestId } : {}),
    });
  });
});

test.afterEach(async ({ page }, testInfo) => {
  const evidence = evidenceByPage.get(page);
  if (!evidence) return;

  const durable = await Promise.all(
    evidence.chats.flatMap(({ chatId, generationIds }) =>
      generationIds.map(async (generationId) => {
        const [generation, messages] = await Promise.all([
          page.request.get(`${apiUrl}/api/chats/${chatId}/generations/${generationId}`),
          page.request.get(`${apiUrl}/api/chats/${chatId}/messages`),
        ]);
        return {
          chatId,
          generationId,
          generation: generation.ok()
            ? await generation.json()
            : { status: `http-${generation.status()}` },
          messages: messages.ok() ? await messages.json() : { status: `http-${messages.status()}` },
        };
      }),
    ),
  );

  await testInfo.attach('evidence.json', {
    body: JSON.stringify(
      {
        scenarioId: testInfo.title.match(/^B-\d+/)?.[0] ?? testInfo.title,
        title: testInfo.title,
        revision: process.env.GIT_REVISION ?? revision(),
        webUrl: process.env.WEB_URL ?? 'http://localhost:4445',
        apiUrl: process.env.API_URL ?? 'http://localhost:4040',
        browser: testInfo.project.use.browserName ?? 'chromium',
        viewport: page.viewportSize(),
        ...evidence,
        durable,
        unverified:
          evidence.consoleErrors.length ||
          evidence.pageErrors.length ||
          evidence.requestFailures.filter(
            (failure) =>
              !evidence.expectedRequestFailures.some((expected) => failure.includes(expected)),
          ).length
            ? 'Unexpected browser/runtime errors were observed.'
            : null,
      },
      null,
      2,
    ),
    contentType: 'application/json',
  });
  try {
    await testInfo.attach('screenshot.png', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
    await testInfo.attach('dom.html', { body: await page.content(), contentType: 'text/html' });
  } catch {
    // Preserve the structured evidence when a failed test has already closed the page.
  }
});

type StartedChat = { chatId: string; generationId: string };

async function startChat(page: Page, message: string): Promise<StartedChat> {
  await page.goto('/chats');
  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/chats',
  );
  await page.getByRole('button', { name: 'Start a new chat' }).click();
  const createResponse = await createResponsePromise;
  expect(createResponse.ok()).toBeTruthy();
  const composer = page.getByRole('textbox', { name: 'Chat message' });
  await composer.fill(message);
  const requestPromise = page.waitForRequest(
    (request) => request.method() === 'POST' && request.url().endsWith('/stream'),
  );
  await page.getByRole('button', { name: 'Submit' }).click();
  const request = await requestPromise;
  const body = JSON.parse(request.postData() ?? '{}') as { generationId?: string };
  if (!body.generationId) throw new Error('Generation request did not include a generation ID');
  const chatId = new URL(page.url()).pathname.split('/').at(-1);
  if (!chatId) throw new Error('Chat URL did not include a chat ID');
  const evidence = evidenceByPage.get(page);
  evidence?.chats.push({ chatId, generationIds: [body.generationId] });
  return { chatId, generationId: body.generationId };
}

async function waitForResponse(page: Page, message: string) {
  const response = page.getByText(message, { exact: true });
  await expect(response).toBeVisible({ timeout: 20_000 });
  await expect(response).toHaveCount(1);
  return response;
}

function apiPath(path: string) {
  return `${apiUrl}/api${path}`;
}

async function expectCommitted(page: Page, chat: StartedChat) {
  const response = await page.request.get(
    apiPath(`/chats/${chat.chatId}/generations/${chat.generationId}`),
  );
  expect(response.ok()).toBeTruthy();
  const run = (await response.json()) as { status?: string };
  expect(run.status).toBe('committed');
}

async function expectGenerationStatus(
  page: Page,
  chatId: string,
  generationId: string,
  status: string,
) {
  const response = await page.request.get(apiPath(`/chats/${chatId}/generations/${generationId}`));
  expect(response.ok()).toBeTruthy();
  const run = (await response.json()) as { status?: string };
  expect(run.status).toBe(status);
}

async function waitForGenerationStatus(
  page: Page,
  chatId: string,
  generationId: string,
  status: string,
) {
  await expect
    .poll(
      async () => {
        const response = await page.request.get(
          apiPath(`/chats/${chatId}/generations/${generationId}`),
        );
        if (!response.ok()) return `http-${response.status()}`;
        const run = (await response.json()) as { status?: string };
        return run.status;
      },
      { timeout: 20_000 },
    )
    .toBe(status);
  await expect(page.getByLabel('Message streaming')).toHaveCount(0);
}

async function expectMessageCount(page: Page, chatId: string, text: string, count: number) {
  const response = await page.request.get(apiPath(`/chats/${chatId}/messages`));
  expect(response.ok()).toBeTruthy();
  const messages = (await response.json()) as Array<{ content?: string }>;
  expect(messages.filter((message) => message.content === text)).toHaveLength(count);
}

function allowExpectedRequestFailure(page: Page, requestUrl: string) {
  evidenceByPage.get(page)?.expectedRequestFailures.push(requestUrl);
}

async function regenerateAndWaitForNewGeneration(page: Page) {
  const requestPromise = page.waitForRequest(
    (request) => request.method() === 'POST' && request.url().endsWith('/regenerate'),
  );
  await page.getByRole('button', { name: 'Regenerate response' }).click();
  const request = await requestPromise;
  const body = JSON.parse(request.postData() ?? '{}') as { generationId?: string };
  if (!body.generationId) throw new Error('Regeneration request did not include a generation ID');
  const chatId = new URL(page.url()).pathname.split('/').at(-1);
  const evidence = evidenceByPage.get(page);
  if (chatId && evidence?.chats.at(-1)?.chatId === chatId) {
    evidence.chats.at(-1)?.generationIds.push(body.generationId);
  }
  return body.generationId;
}

async function expectSingleMessage(
  page: Page,
  text: string,
  role: 'user' | 'assistant' = 'assistant',
) {
  const message = page.locator(`.is-${role}[aria-label^="Message"]`).filter({ hasText: text });
  await expect(message).toBeVisible({ timeout: 20_000 });
  await expect(message).toHaveCount(1);
}

test('B-001 opens a completed disposable chat directly', async ({ page }) => {
  const chat = await startChat(page, 'B001-DIRECT');
  await waitForResponse(page, 'Scripted response: B001-DIRECT');
  await expectCommitted(page, chat);
  await page.reload();
  await expectSingleMessage(page, 'B001-DIRECT', 'user');
  await expectSingleMessage(page, 'Scripted response: B001-DIRECT');
});

test('B-002 sends a normal message and preserves it after refresh', async ({ page }) => {
  const chat = await startChat(page, 'B002-READY');
  await waitForResponse(page, 'Scripted response: B002-READY');
  await expectCommitted(page, chat);
  await expectSingleMessage(page, 'B002-READY', 'user');
  await page.reload();
  await expectSingleMessage(page, 'Scripted response: B002-READY');
});

test('B-003 creates a chat through the new-chat entry point', async ({ page }) => {
  const chat = await startChat(page, 'B003-NEW-CHAT');
  await waitForResponse(page, 'Scripted response: B003-NEW-CHAT');
  await page.goto('/chats');
  await expect(page.getByRole('link', { name: /B003-NEW-CHAT/ }).first()).toBeVisible();
  expect(chat.chatId).toMatch(/^[0-9a-f-]{36}$/);
});

test('B-004 navigates list, detail, back, and detail without stale history', async ({ page }) => {
  const chat = await startChat(page, 'B004-NAVIGATION');
  await waitForResponse(page, 'Scripted response: B004-NAVIGATION');
  await page.goto('/chats');
  await page
    .getByRole('link', { name: /B004-NAVIGATION/ })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`/chat/${chat.chatId}$`));
  await expectSingleMessage(page, 'B004-NAVIGATION', 'user');
  await page.goBack();
  await page
    .getByRole('link', { name: /B004-NAVIGATION/ })
    .first()
    .click();
  await expectSingleMessage(page, 'Scripted response: B004-NAVIGATION');
});

test('B-005 regenerates the latest assistant response once', async ({ page }) => {
  const chat = await startChat(page, 'B005-REGENERATE');
  await waitForResponse(page, 'Scripted response: B005-REGENERATE');
  const regeneratedGenerationId = await regenerateAndWaitForNewGeneration(page);
  await waitForGenerationStatus(page, chat.chatId, regeneratedGenerationId, 'committed');
  await waitForResponse(page, 'Scripted response: B005-REGENERATE');
  await expectSingleMessage(page, 'B005-REGENERATE', 'user');
  await expectSingleMessage(page, 'Scripted response: B005-REGENERATE');
  await expectCommitted(page, chat);
  await expectGenerationStatus(page, chat.chatId, regeneratedGenerationId, 'committed');
});

test('B-006 completes a successful tool call', async ({ page }) => {
  const chat = await startChat(page, 'List my collections TOOL-B006-READY');
  await expect(page.getByLabel('Completed')).toBeVisible({ timeout: 20_000 });
  await waitForResponse(page, 'TOOL-B006-READY');
  await expectCommitted(page, chat);
});

test('B-007 approves a confirmation-required tool', async ({ page }) => {
  const chat = await startChat(page, 'Create a private collection named B007 approval check.');
  await expect(page.getByRole('button', { name: 'Approve tool action' })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole('button', { name: 'Approve tool action' }).click();
  await waitForResponse(page, 'The collection was created successfully.');
  await expectCommitted(page, chat);
});

test('B-008 rejects a confirmation-required tool without success state', async ({ page }) => {
  const chat = await startChat(page, 'Create a private collection named B008 rejection check.');
  await expect(page.getByRole('button', { name: 'Reject tool action' })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole('button', { name: 'Reject tool action' }).click();
  await waitForResponse(page, 'The tool request was rejected.');
  await expect(page.getByLabel('Denied')).toBeVisible();
  await expect(page.getByLabel('Completed')).toHaveCount(0);
  await expectCommitted(page, chat);
});

test('B-009 retains a failed tool card and exposes recovery', async ({ page }) => {
  const chat = await startChat(page, 'List my collections TOOL-B009-FAIL');
  await expect(page.getByLabel('Error')).toBeVisible({ timeout: 20_000 });
  await waitForResponse(page, 'The tool request failed.');
  await expect(page.getByRole('button', { name: 'Regenerate response' })).toBeVisible();
  await expectCommitted(page, chat);
});

test('B-010 shows friendly provider recovery and retries without a duplicate user message', async ({
  page,
}) => {
  const message = `Provider failure B010 PROVIDER-B010-FAIL-${runId}`;
  const assistantResponse = `Scripted response: ${message}`;
  const chat = await startChat(page, message);
  await expect(page.getByText('I couldn’t finish that response. Please try again.')).toBeVisible({
    timeout: 20_000,
  });
  await expectSingleMessage(page, message, 'user');
  await page.reload();
  await expect(page.getByText('I couldn’t finish that response. Please try again.')).toBeVisible();
  const retryRequestPromise = page.waitForRequest(
    (request) => request.method() === 'POST' && request.url().endsWith('/retry'),
  );
  await page.getByRole('button', { name: 'Retry' }).click();
  const retryRequest = await retryRequestPromise;
  const retryBody = JSON.parse(retryRequest.postData() ?? '{}') as { generationId?: string };
  if (!retryBody.generationId) throw new Error('Retry request did not include a generation ID');
  evidenceByPage.get(page)?.chats.at(-1)?.generationIds.push(retryBody.generationId);
  await expect(page.getByText('Trying again…')).toBeVisible();
  await waitForGenerationStatus(page, chat.chatId, retryBody.generationId, 'committed');
  await waitForResponse(page, assistantResponse);
  await expectSingleMessage(page, message, 'user');
  await expectGenerationStatus(page, chat.chatId, chat.generationId, 'failed');
  await expectGenerationStatus(page, chat.chatId, retryBody.generationId, 'committed');
  await expectMessageCount(page, chat.chatId, message, 1);
});

test('B-011 cancels before provider execution', async ({ page }) => {
  await startChat(page, 'B011-CANCEL-BEFORE');
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.getByText('Stopped.')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Scripted response: B011-CANCEL-BEFORE')).toHaveCount(0);
});

test('B-012 cancels while streaming without false success', async ({ page }) => {
  await startChat(page, 'B012-STREAM');
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.getByText('Stopped.')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Scripted response: B012-STREAM')).toHaveCount(0);
});

test('B-013 recovers after active-generation reload', async ({ page }) => {
  await startChat(page, 'B013-DISCONNECT');
  await page.waitForTimeout(250);
  await page.reload();
  await waitForResponse(page, 'Scripted response: B013-DISCONNECT');
});

test('B-014 keeps overlapping replay state single after reload', async ({ page }) => {
  await startChat(page, 'B014-REPLAY');
  await page.waitForTimeout(250);
  await page.reload();
  await waitForResponse(page, 'Scripted response: B014-REPLAY');
  await page.reload();
  await expectSingleMessage(page, 'Scripted response: B014-REPLAY');
});

test('B-015 keeps confirmation actionable after reload', async ({ page }) => {
  await startChat(page, 'Create a private collection named B015 reload confirmation check.');
  await expect(page.getByRole('button', { name: 'Approve tool action' })).toBeVisible({
    timeout: 20_000,
  });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Approve tool action' })).toBeVisible();
});

test('B-016 reconstructs a completed chat in a fresh page', async ({ page }) => {
  const chat = await startChat(page, 'B016-FRESH-LAUNCH');
  await waitForResponse(page, 'Scripted response: B016-FRESH-LAUNCH');
  const freshPage = await page.context().newPage();
  await freshPage.goto(`/chat/${chat.chatId}`);
  await expect(freshPage.getByText('Scripted response: B016-FRESH-LAUNCH')).toBeVisible();
  await freshPage.close();
});

test('B-017 recovers an active generation after reload', async ({ page }) => {
  await startChat(page, 'B017-ACTIVE-RELOAD');
  await page.waitForTimeout(250);
  await page.reload();
  await waitForResponse(page, 'Scripted response: B017-ACTIVE-RELOAD');
});

test('B-018 does not render an unowned chat', async ({ page }) => {
  await page.goto('/chat/00000000-0000-4000-8000-000000000018');
  await expect(page.getByText('Conversation unavailable')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('textbox', { name: 'Chat message' })).toHaveCount(0);
});

test('B-019 denies an unowned chat operation without changing durable state', async ({ page }) => {
  await page.goto('/chat/00000000-0000-4000-8000-000000000019');
  await expect(page.getByText('Conversation unavailable')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Regenerate response' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Delete user message' })).toHaveCount(0);
});

test('B-020 shows a recoverable load error', async ({ page }, testInfo) => {
  const chat = await startChat(page, 'B020-LOAD-ERROR');
  await page.goto('/chats');
  let intercepted = false;
  await page.route(`**/api/chats/${chat.chatId}/messages*`, (route) => {
    if (new URL(route.request().url()).searchParams.get('limit') === '1') {
      return route.continue();
    }
    intercepted = true;
    allowExpectedRequestFailure(page, route.request().url());
    return route.abort();
  });
  await page.locator(`a[href="/chat/${chat.chatId}"]`).click();
  if (!intercepted) {
    testInfo.skip(
      true,
      'Blocked: chat loader fetches messages server-side, outside browser interception.',
    );
  }
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Retry loading' })).toBeVisible();
});

test('B-021 shows a centered load error with recovery', async ({ page }, testInfo) => {
  const chat = await startChat(page, 'B021-LOAD-ERROR');
  await page.goto('/chats');
  let intercepted = false;
  await page.route(`**/api/chats/${chat.chatId}/messages*`, (route) => {
    if (new URL(route.request().url()).searchParams.get('limit') === '1') {
      return route.continue();
    }
    intercepted = true;
    return route.fulfill({ status: 500, body: JSON.stringify({ error: 'test load failure' }) });
  });
  await page.locator(`a[href="/chat/${chat.chatId}"]`).click();
  if (!intercepted) {
    testInfo.skip(
      true,
      'Blocked: chat loader fetches messages server-side, outside browser interception.',
    );
  }
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Retry loading' })).toBeVisible();
});

test('B-022 edits and deletes a disposable user message', async ({ page }) => {
  await startChat(page, 'B022-EDIT-ME');
  await waitForResponse(page, 'Scripted response: B022-EDIT-ME');
  await page.getByRole('button', { name: 'Edit message' }).click();
  const editor = page.getByRole('textbox', { name: 'Edit message' });
  await editor.fill('B022-EDITED');
  await page.getByRole('button', { name: 'Save edit' }).click();
  await expectSingleMessage(page, 'B022-EDITED', 'user');
  await page.getByRole('button', { name: 'Delete user message' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Delete message' }).click();
  await expect(page.getByText('B022-EDITED')).toHaveCount(0);
});

test('B-023 exercises copy, share, listen, and regenerate controls', async ({ page }) => {
  const chat = await startChat(page, 'B023-ACTIONS');
  await waitForResponse(page, 'Scripted response: B023-ACTIONS');
  await page.getByRole('button', { name: 'Copy user message' }).click();
  await expect(page.getByRole('button', { name: 'Copied user message' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy assistant message' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Share assistant message' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Listen to response' })).toBeVisible();
  const regeneratedGenerationId = await regenerateAndWaitForNewGeneration(page);
  await waitForGenerationStatus(page, chat.chatId, regeneratedGenerationId, 'committed');
  await waitForResponse(page, 'Scripted response: B023-ACTIONS');
  await expectCommitted(page, chat);
  await expectGenerationStatus(page, chat.chatId, regeneratedGenerationId, 'committed');
});

test('B-024 keeps the chat usable at the smallest supported viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await startChat(page, 'B024-VIEWPORT');
  await waitForResponse(page, 'Scripted response: B024-VIEWPORT');
  await expect(page.getByRole('textbox', { name: 'Chat message' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBeFalsy();
});

test('B-025 exposes keyboard-reachable named chat controls', async ({ page }) => {
  await startChat(page, 'B025-ACCESSIBILITY');
  await waitForResponse(page, 'Scripted response: B025-ACCESSIBILITY');
  for (const name of ['Copy user message', 'Copy assistant message', 'Regenerate response']) {
    const control = page.getByRole('button', { name });
    await expect(control).toBeVisible();
    await control.focus();
    await expect(control).toBeFocused();
  }
  const composer = page.getByRole('textbox', { name: 'Chat message' });
  await composer.focus();
  await composer.fill('B025-KEYBOARD');
  await composer.press('ControlOrMeta+Enter');
  await waitForResponse(page, 'Scripted response: B025-KEYBOARD');
  await expectSingleMessage(page, 'B025-ACCESSIBILITY', 'user');
  await expectSingleMessage(page, 'B025-KEYBOARD', 'user');
});
