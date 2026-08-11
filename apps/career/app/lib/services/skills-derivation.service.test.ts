// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createChatCompletion: vi.fn(),
  recordAIUsageEvent: vi.fn(),
  listProjects: vi.fn(),
  listWorkExperiences: vi.fn(),
}));

vi.mock('@hominem/ai', () => ({
  createChatCompletion: mocks.createChatCompletion,
  getChatCompletionText: vi.fn(
    (result: { choices?: Array<{ message?: { content?: string } }> }) =>
      result.choices?.[0]?.message?.content ?? '',
  ),
  getChatCompletionUsage: vi.fn((result: { model: string; usage?: Record<string, unknown> }) => ({
    provider: 'openrouter',
    model: result.model,
    promptTokens: Number(result.usage?.promptTokens ?? 0),
    completionTokens: Number(result.usage?.completionTokens ?? 0),
    totalTokens: Number(result.usage?.totalTokens ?? 0),
    reportedTotalTokens: null,
    costUsd: Number(result.usage?.cost ?? 0),
    cachedPromptTokens: null,
    reasoningTokens: null,
  })),
}));

vi.mock('@hominem/services', () => ({
  recordAIUsageEvent: mocks.recordAIUsageEvent,
  startAIUsageTimer: () => () => 0,
}));

vi.mock('@hominem/db', () => ({
  db: {},
  CareerRepository: {
    listEngagements: mocks.listWorkExperiences,
  },
  ProjectRepository: {
    list: mocks.listProjects,
  },
}));

import { deriveSkillsFromCareerHistory } from './skills-derivation.service';

describe('deriveSkillsFromCareerHistory', () => {
  beforeEach(() => {
    mocks.listWorkExperiences.mockResolvedValue([
      {
        role: 'Engineer',
        company: 'Acme',
        description: 'Built systems',
        startDate: '2020-01',
        endDate: null,
      },
    ]);
    mocks.listProjects.mockResolvedValue([]);
    mocks.recordAIUsageEvent.mockResolvedValue(undefined);
    mocks.createChatCompletion.mockResolvedValue({
      model: 'skills-model',
      usage: { promptTokens: 8, completionTokens: 5, totalTokens: 13, cost: 0.11 },
      choices: [{ message: { content: '{not-json' } }],
    });
  });

  it('records usage before json parsing fails', async () => {
    await expect(deriveSkillsFromCareerHistory('user-id', 'portfolio-id')).rejects.toThrow();
    expect(mocks.recordAIUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        feature: 'career_skills_derive',
        usage: expect.objectContaining({ totalTokens: 13, costUsd: 0.11 }),
      }),
    );
  });
});
