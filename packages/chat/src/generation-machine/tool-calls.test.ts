import { describe, expect, it } from 'vitest';

import {
  reduceConfirmationApproved,
  reduceConfirmationRejected,
  reduceProviderTurnCompleted,
  reduceToolResult,
} from './tool-calls';
import type { GenerationState, GenerationToolCall } from './types';

function baseState(overrides: Partial<GenerationState> = {}): GenerationState {
  return {
    generationId: 'generation-1',
    phase: 'running',
    iteration: 0,
    turnId: 'turn-1',
    assistantText: '',
    reasoningText: '',
    requestedToolCalls: [],
    toolCalls: [],
    pendingToolCalls: [],
    completedToolResults: [],
    activeToolCall: null,
    pendingConfirmation: null,
    lastError: null,
    ...overrides,
  };
}

function call(overrides: Partial<GenerationToolCall> = {}): GenerationToolCall {
  return {
    id: 'call-1',
    name: 'search_memories',
    arguments: '{}',
    iteration: 0,
    turnId: 'turn-1',
    ...overrides,
  };
}

describe('reduceProviderTurnCompleted', () => {
  it('fails when a required tool call is missing', () => {
    const step = reduceProviderTurnCompleted(baseState(), {
      type: 'provider-turn-completed',
      requiredToolCall: true,
      confirmationCallIds: [],
    });

    expect(step.state.phase).toBe('failed');
    expect(step.state.lastError).toBe('The model did not perform the required lookup');
  });

  it('moves to saving when no tool call was requested and none is required', () => {
    const step = reduceProviderTurnCompleted(baseState(), {
      type: 'provider-turn-completed',
      requiredToolCall: false,
      confirmationCallIds: [],
    });

    expect(step.state.phase).toBe('saving');
    expect(step.commands.at(-1)).toEqual({ type: 'save-generation' });
  });

  it('runs an unconfirmed call immediately', () => {
    const state = baseState({ requestedToolCalls: [call()] });
    const step = reduceProviderTurnCompleted(state, {
      type: 'provider-turn-completed',
      requiredToolCall: false,
      confirmationCallIds: [],
    });

    expect(step.state.activeToolCall).toEqual(call());
    expect(step.state.pendingToolCalls).toEqual([]);
    expect(step.commands.at(-1)).toMatchObject({
      type: 'execute-tool',
      idempotencyKey: 'generation-1:turn-1:call-1',
    });
  });

  it('pauses at awaiting_confirmation for a call requiring confirmation', () => {
    const state = baseState({ requestedToolCalls: [call({ name: 'forget_memory' })] });
    const step = reduceProviderTurnCompleted(state, {
      type: 'provider-turn-completed',
      requiredToolCall: false,
      confirmationCallIds: ['call-1'],
    });

    expect(step.state.phase).toBe('awaiting_confirmation');
    expect(step.state.pendingConfirmation).toEqual(call({ name: 'forget_memory' }));
    expect(step.commands.some((command) => command.type === 'execute-tool')).toBe(false);
    expect(step.commands.at(-1)).toMatchObject({ type: 'preview-tool' });
  });
});

describe('reduceToolResult', () => {
  it('chains to the next pending call before opening a new provider turn', () => {
    const first = call({ id: 'call-1', name: 'first' });
    const second = call({ id: 'call-2', name: 'second' });
    const state = baseState({
      activeToolCall: first,
      pendingToolCalls: [second],
      toolCalls: [first, second],
    });

    const step = reduceToolResult(state, {
      callId: 'call-1',
      toolName: 'first',
      content: '{}',
      error: false,
    });

    expect(step.state.activeToolCall).toEqual(second);
    expect(step.state.pendingToolCalls).toEqual([]);
    expect(step.commands.at(-1)).toMatchObject({ type: 'execute-tool', call: { id: 'call-2' } });
  });

  it('opens the next provider turn once every call has finished', () => {
    const state = baseState({ activeToolCall: call(), toolCalls: [call()], iteration: 0 });

    const step = reduceToolResult(state, {
      callId: 'call-1',
      toolName: 'search_memories',
      content: '{}',
      error: false,
    });

    expect(step.state.iteration).toBe(1);
    expect(step.state.phase).toBe('running');
    expect(step.commands.at(-1)).toEqual({
      type: 'open-provider-turn',
      turnId: 'generation-1:1',
      iteration: 1,
    });
  });
});

describe('reduceConfirmationApproved', () => {
  it('records approval before executing the confirmed tool', () => {
    const state = baseState({ phase: 'awaiting_confirmation', pendingConfirmation: call() });
    const step = reduceConfirmationApproved(state, { callId: 'call-1' });

    expect(step.commands[0]).toEqual({
      type: 'persist',
      event: { type: 'confirmation.approved', callId: 'call-1' },
      idempotencyKey: 'generation-1:confirmation.approved:call-1',
    });
    expect(step.state.phase).toBe('running');
    expect(step.commands.at(-1)).toMatchObject({ type: 'execute-tool' });
  });

  it('does not respond to an approval for another tool call', () => {
    const state = baseState({ phase: 'awaiting_confirmation', pendingConfirmation: call() });
    expect(reduceConfirmationApproved(state, { callId: 'other-call' })).toEqual({
      state,
      commands: [],
    });
  });
});

describe('reduceConfirmationRejected', () => {
  it('converts rejection into a failed tool result and continues the turn', () => {
    const state = baseState({ phase: 'awaiting_confirmation', pendingConfirmation: call() });
    const step = reduceConfirmationRejected(state, { callId: 'call-1', reason: 'not now' });

    expect(step.state.completedToolResults[0]).toMatchObject({ callId: 'call-1', error: true });
    expect(step.commands).toContainEqual({
      type: 'persist',
      event: { type: 'confirmation.rejected', callId: 'call-1', reason: 'not now' },
      idempotencyKey: 'generation-1:confirmation.rejected:call-1',
    });
  });

  it('does not respond to a rejection for another tool call', () => {
    const state = baseState({ phase: 'awaiting_confirmation', pendingConfirmation: call() });
    expect(reduceConfirmationRejected(state, { callId: 'other-call', reason: 'not now' })).toEqual({
      state,
      commands: [],
    });
  });
});
