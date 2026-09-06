import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import {
  fragmentedToolCallTurn,
  HominemTests,
  multipleToolCallTurn,
  providerFailureTurn,
  scriptedProvider,
  textTurn,
  type TestTool,
} from './hominem-tests';

describe('HominemTests', () => {
  let test: HominemTests | undefined;
  let otherTest: HominemTests | undefined;
  let warningSpy: { mock: { calls: unknown[][] }; mockRestore: () => void };
  let expectedWarnings: string[];

  const expectWarning = (message: string) => {
    expectedWarnings.push(message);
  };

  beforeEach(() => {
    expectedWarnings = [];
    warningSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    if (test) expect((await test.close()).remainingChats).toBe(0);
    await otherTest?.close();
    const warnings = warningSpy.mock.calls.map((args) => String(args[0]));
    expect(
      warnings.every((warning) => expectedWarnings.some((expected) => warning.includes(expected))),
    ).toBe(true);
    for (const expected of expectedWarnings) {
      expect(warnings.some((warning) => warning.includes(expected))).toBe(true);
    }
    warningSpy.mockRestore();
    test = undefined;
    otherTest = undefined;
  });

  it('runs a scripted start generation through the real route and database', async () => {
    const usage = {
      provider: 'openrouter' as const,
      model: 'scripted-model',
      promptTokens: 4,
      outputTokens: 6,
      totalTokens: 10,
      reportedTotalTokens: 10,
      costUsd: 0.01,
      cachedPromptTokens: null,
      reasoningTokens: 2,
    };
    test = await HominemTests.create({
      provider: scriptedProvider([textTurn('SDK reply')], undefined, [usage]),
    });

    const result = await test.chat.start({ title: 'SDK chat', message: 'Hello' });

    expect(result.response.status).toBe(200);
    expect(result.doneCount).toBe(1);
    expect(result.durableEvents.map((event) => event.payload.type)).toContain(
      'generation.committed',
    );
    expect(result.clientState.phase).toBe('committed');
    expect(result.clientState.text).toBe('SDK reply');
    const inspected = await test.inspect(result.generationId);
    expect(inspected.usage).toMatchObject({
      requestCount: 1,
      succeededCount: 1,
      totalTokens: 10,
      outputTokens: 6,
    });
  });

  it('publishes redacted evidence with durable duplicate checks', async () => {
    test = await HominemTests.create({
      provider: scriptedProvider([textTurn('Evidence reply')]),
    });

    const result = await test.chat.start({ title: 'SDK evidence', message: 'Capture this' });
    const evidence = await test.evidence(result.generationId, {
      scenarioId: 'SDK-001',
      chatId: result.chatId,
    });

    expect(evidence).toMatchObject({
      schemaVersion: 1,
      scenarioId: 'SDK-001',
      correlation: {
        generationId: result.generationId,
        requestId: result.generationId,
      },
      terminalState: 'committed',
      durableSequence: expect.any(Number),
      messageIds: {
        user: [expect.any(String)],
        assistant: [expect.any(String)],
      },
      duplicateChecks: {
        userMessages: true,
        assistantMessages: true,
        toolCalls: true,
        terminalEvents: true,
      },
    });
    expect(JSON.stringify(evidence)).not.toContain('Capture this');
  });

  it('writes a manifest artifact for browser and mobile evidence consumers', async () => {
    test = await HominemTests.create({
      provider: scriptedProvider([textTurn('Persisted evidence')]),
    });
    const result = await test.chat.start({ title: 'SDK artifact', message: 'Write evidence' });
    const directory = await mkdtemp(join(tmpdir(), 'hominem-testkit-'));
    const outputPath = join(directory, 'SDK-002.json');

    try {
      const manifest = await test.writeEvidence(result.generationId, {
        scenarioId: 'SDK-002',
        outputPath,
        chatId: result.chatId,
      });
      expect(JSON.parse(await readFile(outputPath, 'utf8'))).toEqual(manifest);
      expect(manifest.artifactPaths).toEqual([outputPath]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('commits a valid response when the provider omits usage metadata', async () => {
    expectWarning('[ai-usage] provider response missing usage');
    test = await HominemTests.create({
      provider: scriptedProvider([textTurn('Valid response without usage')], undefined, []),
    });

    const result = await test.chat.start({ title: 'SDK missing usage', message: 'No usage' });
    const inspected = await test.inspect(result.generationId);

    expect(result.response.status).toBe(200);
    expect(result.clientState.phase).toBe('committed');
    expect(result.clientState.text).toBe('Valid response without usage');
    expect(inspected.usage).toMatchObject({
      requestCount: 1,
      succeededCount: 1,
      usageAvailableCount: 0,
      totalTokens: 0,
    });
  });

  it('executes a fragmented tool call through the injected test tool runtime', async () => {
    const inputSchema = z.object({ value: z.string() }).strict();
    const tool: TestTool = {
      definition: {
        name: 'sdk_echo',
        title: 'SDK echo',
        description: 'Echoes a value for integration tests.',
        inputSchema,
        outputSchema: z.object({ value: z.string() }).strict(),
        readOnly: true,
        scopes: ['memory:read'],
        resultCap: 1,
      },
      execute: async ({ input }) => inputSchema.parse(input),
    };
    const provider = scriptedProvider([
      fragmentedToolCallTurn('sdk_echo', 'call-sdk', ['{"value":"hel', 'lo"}']),
      textTurn('Tool completed'),
    ]);
    test = await HominemTests.create({ provider });
    test.tools.add(tool);

    const result = await test.chat.start({ title: 'SDK tools', message: 'Use the tool' });

    expect(result.clientState.phase).toBe('committed');
    expect(result.clientState.text).toBe('Tool completed');
    expect(provider.calls).toBe(2);
    expect((await test.inspect(result.generationId)).messages).toHaveLength(2);
  });

  it('executes multiple provider tool calls in order through the real tool boundary', async () => {
    const inputSchema = z.object({ value: z.string() }).strict();
    const executions: string[] = [];
    const makeTool = (name: string): TestTool => ({
      definition: {
        name,
        title: name,
        description: `Executes ${name} for integration tests.`,
        inputSchema,
        outputSchema: z.object({ value: z.string() }).strict(),
        readOnly: true,
        scopes: ['memory:read'],
        resultCap: 1,
      },
      execute: async ({ input }) => {
        const parsed = inputSchema.parse(input);
        executions.push(`${name}:${parsed.value}`);
        return parsed;
      },
    });
    const provider = scriptedProvider([
      multipleToolCallTurn([
        { name: 'sdk_first_tool', id: 'call-first', arguments: '{"value":"first"}' },
        { name: 'sdk_second_tool', id: 'call-second', arguments: '{"value":"second"}' },
      ]),
      textTurn('Both tools completed'),
    ]);
    test = await HominemTests.create({ provider });
    test.tools.add(makeTool('sdk_first_tool'));
    test.tools.add(makeTool('sdk_second_tool'));

    const result = await test.chat.start({ title: 'SDK multiple tools', message: 'Use both' });
    const inspected = await test.inspect(result.generationId);

    expect(result.clientState.phase).toBe('committed');
    expect(result.clientState.text).toBe('Both tools completed');
    expect(executions).toEqual(['sdk_first_tool:first', 'sdk_second_tool:second']);
    expect(
      inspected.events.filter((event) => event.payload.type === 'tool.completed'),
    ).toHaveLength(2);
    expect(inspected.messages).toHaveLength(2);
    expect(provider.calls).toBe(2);
  });

  it('supports send, terminal replay, and duplicate-safe client convergence', async () => {
    const provider = scriptedProvider([textTurn('First reply'), textTurn('Second reply')]);
    test = await HominemTests.create({ provider });

    const started = await test.chat.start({ title: 'SDK replay', message: 'First' });
    const chatId = started.chatId;
    if (!chatId) throw new Error('The accepted event did not contain a chat ID');
    const sent = await test.chat.send(chatId, { message: 'Second' });
    const duplicate = await test.chat.send(chatId, {
      generationId: sent.generationId,
      message: 'Second',
    });
    const replay = await test.chat.replay(chatId, sent.generationId, 1);

    expect(sent.clientState.phase).toBe('committed');
    expect(sent.clientState.text).toBe('Second reply');
    expect(duplicate.events.length).toBeGreaterThan(0);
    expect(duplicate.events.every((event) => event.generationId === sent.generationId)).toBe(true);
    expect(provider.calls).toBe(2);
    expect(replay.clientState.phase).toBe('committed');
    expect(replay.clientState.text).toBe('Second reply');
  });

  it('scripts a transient provider failure and verifies durable retry evidence', async () => {
    const provider = scriptedProvider([
      providerFailureTurn('temporary provider failure', { transient: true }),
      textTurn('Recovered reply'),
    ]);
    test = await HominemTests.create({ provider });

    const result = await test.chat.start({ title: 'SDK retry', message: 'Retry this' });
    const inspected = await test.inspect(result.generationId);
    const durableTypes = inspected.events.map((event) => event.payload.type);

    expect(result.clientState.phase).toBe('committed');
    expect(result.clientState.text).toBe('Recovered reply');
    expect(durableTypes).toContain('generation.retry_scheduled');
    expect(durableTypes.at(-1)).toBe('generation.committed');
    expect(provider.calls).toBe(2);
  });

  it('scripts a permanent provider failure and preserves a durable terminal failure', async () => {
    expectWarning('[ai-usage] provider response missing usage');
    const provider = scriptedProvider([providerFailureTurn('provider unavailable')]);
    test = await HominemTests.create({ provider });

    const result = await test.chat.start({ title: 'SDK failure', message: 'Fail this' });
    const inspected = await test.inspect(result.generationId);

    expect(result.clientState.phase).toBe('failed');
    expect(inspected.run?.status).toBe('failed');
    expect(inspected.events.at(-1)?.payload.type).toBe('generation.failed');
  });

  it('retries a failed generation without duplicating its user message', async () => {
    expectWarning('[ai-usage] provider response missing usage');
    const provider = scriptedProvider([
      providerFailureTurn('provider unavailable'),
      textTurn('Recovered reply'),
    ]);
    test = await HominemTests.create({ provider });

    const failed = await test.chat.start({ title: 'SDK retry recovery', message: 'Retry this' });
    expect(failed.clientState.phase).toBe('failed');
    const failedUserMessageId = (await test.inspect(failed.generationId)).run?.userMessageId;

    const retried = await test.chat.retry(failed.chatId!, failed.generationId, {
      generationId: '01a060d0-0000-7000-8000-000000000001',
    });
    const duplicateRetry = await test.chat.retry(failed.chatId!, failed.generationId, {
      generationId: '01a060d0-0000-7000-8000-000000000001',
    });
    const failedState = await test.inspect(failed.generationId);
    const retriedState = await test.inspect(retried.generationId);

    expect(retried.clientState.phase).toBe('committed');
    expect(retried.clientState.text).toBe('Recovered reply');
    expect(duplicateRetry.clientState.text).toBe('Recovered reply');
    expect(provider.calls).toBe(2);
    // Retry supersedes the failed attempt outright, same as regenerating a
    // completed reply — its run and event log are gone, not kept as a
    // failure record, once the retry commits.
    expect(failedState.run).toBeNull();
    expect(failedState.events).toEqual([]);
    expect(retriedState.run?.status).toBe('committed');
    expect(retriedState.run?.userMessageId).toBe(failedUserMessageId);
    expect(retriedState.messages.filter((message) => message.role === 'user')).toHaveLength(1);
    expect(retriedState.messages.filter((message) => message.role === 'assistant')).toHaveLength(1);
  });

  it('checkpoints confirmation and resumes the same generation after approval', async () => {
    const inputSchema = z.object({ value: z.string() }).strict();
    const tool: TestTool = {
      definition: {
        name: 'sdk_confirm',
        title: 'SDK confirmation',
        description: 'Requires approval for an integration test.',
        inputSchema,
        outputSchema: z.object({ value: z.string() }).strict(),
        readOnly: false,
        scopes: ['memory:write'],
        resultCap: 1,
        requiresConfirmation: true,
      },
      execute: async ({ input }) => inputSchema.parse(input),
    };
    const provider = scriptedProvider([
      fragmentedToolCallTurn('sdk_confirm', 'call-confirm', ['{"value":"approved"}'], {
        requiresConfirmation: true,
      }),
      textTurn('Approval completed'),
    ]);
    test = await HominemTests.create({ provider });
    test.tools.add(tool);

    const checkpoint = await test.chat.start({
      title: 'SDK confirmation',
      message: 'Approve this',
    });
    const inspected = await test.inspect(checkpoint.generationId);
    const assistant = inspected.messages.find((message) => message.role === 'assistant');
    const call = assistant?.toolCalls?.[0];
    if (!checkpoint.chatId || !assistant || !call)
      throw new Error('Confirmation checkpoint incomplete');

    const resumed = await test.chat.respondToConfirmation(
      checkpoint.chatId,
      assistant.id,
      call.toolCallId,
      { approved: true },
    );

    expect(checkpoint.clientState.phase).toBe('awaiting_confirmation');
    expect(resumed.clientState.phase).toBe('committed');
    expect(resumed.clientState.text).toContain('Approval completed');
    expect(
      resumed.events.some(
        (event) => 'sequence' in event && event.payload.type === 'confirmation.approved',
      ),
    ).toBe(true);
    const after = await test.inspect(checkpoint.generationId);
    const assistantMessages = after.messages.filter((message) => message.role === 'assistant');
    expect(assistantMessages).toHaveLength(1);
    expect(assistantMessages[0]?.content).toBe('Approval completed');
    expect(provider.calls).toBe(2);
  });

  it('turns an append failure into a durable terminal failure', async () => {
    test = await HominemTests.create({
      provider: scriptedProvider([textTurn('Should not commit')]),
    });
    test.failures.inject('event-append', undefined, 3);

    const result = await test.chat.start({ title: 'SDK append failure', message: 'Fail append' });
    const inspected = await test.inspect(result.generationId);

    expect(result.clientState.phase).toBe('failed');
    expect(inspected.run?.status).toBe('failed');
    expect(inspected.events.at(-1)?.payload.type).toBe('generation.failed');
    expect(inspected.messages).toHaveLength(1);
  });

  it('durably terminalizes when the snapshot commit fails', async () => {
    test = await HominemTests.create({
      provider: scriptedProvider([textTurn('Snapshot must not commit')]),
    });
    test.failures.inject('snapshot-commit');

    const result = await test.chat.start({ title: 'SDK snapshot failure', message: 'Fail save' });
    const inspected = await test.inspect(result.generationId);

    expect(result.clientState.phase).toBe('failed');
    expect(inspected.run?.status).toBe('failed');
    expect(inspected.messages).toHaveLength(1);
    expect(inspected.events.at(-1)?.payload.type).toBe('generation.failed');
  });

  it('surfaces a cancellation commit failure without fabricating cancellation', async () => {
    test = await HominemTests.create({
      provider: scriptedProvider([textTurn('Already complete')]),
    });
    const result = await test.chat.start({
      title: 'SDK cancellation failure',
      message: 'Complete first',
    });
    if (!result.chatId) throw new Error('The accepted event did not contain a chat ID');
    test.failures.inject('cancellation-commit');

    const cancelled = await test.chat.cancel(result.chatId, result.generationId);
    const inspected = await test.inspect(result.generationId);

    expect(cancelled.response.status).toBe(500);
    expect(inspected.run?.status).toBe('committed');
    expect(inspected.events.at(-1)?.payload.type).toBe('generation.committed');
  });

  it('persists a failed tool effect and continues with the provider result', async () => {
    const inputSchema = z.object({ value: z.string() }).strict();
    const tool: TestTool = {
      definition: {
        name: 'sdk_failing_tool',
        title: 'SDK failing tool',
        description: 'Fails deterministically for integration tests.',
        inputSchema,
        outputSchema: z.object({ value: z.string() }).strict(),
        readOnly: true,
        scopes: ['memory:read'],
        resultCap: 1,
      },
      execute: async () => {
        throw new Error('deterministic tool failure');
      },
    };
    const provider = scriptedProvider([
      fragmentedToolCallTurn('sdk_failing_tool', 'call-fail', ['{"value":"x"}']),
      textTurn('Recovered after tool failure'),
    ]);
    test = await HominemTests.create({ provider });
    test.tools.add(tool);

    const result = await test.chat.start({ title: 'SDK tool failure', message: 'Use it' });
    const inspected = await test.inspect(result.generationId);

    expect(result.clientState.phase).toBe('committed');
    expect(result.clientState.text).toBe('Recovered after tool failure');
    expect(inspected.events.some((event) => event.payload.type === 'tool.failed')).toBe(true);
  });

  it('records confirmation rejection and does not execute the tool', async () => {
    const inputSchema = z.object({ value: z.string() }).strict();
    let executions = 0;
    const tool: TestTool = {
      definition: {
        name: 'sdk_rejected_tool',
        title: 'SDK rejected tool',
        description: 'Requires approval for integration tests.',
        inputSchema,
        outputSchema: z.object({ value: z.string() }).strict(),
        readOnly: false,
        scopes: ['memory:write'],
        resultCap: 1,
        requiresConfirmation: true,
      },
      execute: async ({ input }) => {
        executions += 1;
        return inputSchema.parse(input);
      },
    };
    const provider = scriptedProvider([
      fragmentedToolCallTurn('sdk_rejected_tool', 'call-reject', ['{"value":"no"}'], {
        requiresConfirmation: true,
      }),
      textTurn('Rejection acknowledged'),
    ]);
    test = await HominemTests.create({ provider });
    test.tools.add(tool);

    const checkpoint = await test.chat.start({ title: 'SDK rejection', message: 'Reject it' });
    const inspected = await test.inspect(checkpoint.generationId);
    const assistant = inspected.messages.find((message) => message.role === 'assistant');
    const call = assistant?.toolCalls?.[0];
    if (!checkpoint.chatId || !assistant || !call)
      throw new Error('Rejection checkpoint incomplete');

    const rejected = await test.chat.respondToConfirmation(
      checkpoint.chatId,
      assistant.id,
      call.toolCallId,
      { approved: false },
    );
    const after = await test.inspect(checkpoint.generationId);

    expect(rejected.clientState.phase).toBe('committed');
    expect(after.events.some((event) => event.payload.type === 'confirmation.rejected')).toBe(true);
    expect(executions).toBe(0);
  });

  it('regenerates an assistant message through the real route and replaces its projection', async () => {
    const provider = scriptedProvider([
      textTurn('Original answer'),
      textTurn('Regenerated answer'),
    ]);
    test = await HominemTests.create({ provider });

    const started = await test.chat.start({ title: 'SDK regenerate', message: 'Answer twice' });
    if (!started.chatId) throw new Error('The accepted event did not contain a chat ID');
    const inspected = await test.inspect(started.generationId);
    const assistant = inspected.messages.find((message) => message.role === 'assistant');
    if (!assistant) throw new Error('The generation did not create an assistant message');

    const regenerated = await test.chat.regenerate(started.chatId, assistant.id, {});
    const after = await test.inspect(regenerated.generationId);

    expect(regenerated.clientState.phase).toBe('committed');
    expect(regenerated.clientState.text).toBe('Regenerated answer');
    expect(after.messages.filter((message) => message.role === 'assistant')).toHaveLength(1);
    expect(provider.calls).toBe(2);
  });

  it('enforces owner isolation through the real replay route', async () => {
    test = await HominemTests.create({
      provider: scriptedProvider([textTurn('Private reply')]),
    });
    otherTest = await HominemTests.create({
      provider: scriptedProvider([]),
    });
    const ownerResult = await test.chat.start({ title: 'Private chat', message: 'Private' });
    if (!ownerResult.chatId) throw new Error('The accepted event did not contain a chat ID');

    const intruderResult = await otherTest.chat.replay(
      ownerResult.chatId,
      ownerResult.generationId,
    );

    expect(intruderResult.response.status).toBe(404);
    expect(intruderResult.events).toHaveLength(0);
  });
});
