import { Flags, Command } from '@oclif/core';
import { z } from 'zod';

import type { JsonValue } from '@/contracts';

import { requestJson } from '@/http';
import { parseJsonPayload } from '@/http';
import { validateWithZod } from '@/utils/zod-validation';

function normalizeModels(jsonText: string): string[] {
  const parsed = parseJsonPayload(jsonText, '/api/ai/models');
  if (Array.isArray(parsed)) {
    const models: string[] = [];
    for (const item of parsed) {
      if (typeof item === 'string') {
        models.push(item);
      } else if (item !== null && typeof item === 'object' && 'id' in item) {
        const id = (item as Record<string, JsonValue>).id;
        if (typeof id === 'string') {
          models.push(id);
        }
      }
    }
    if (models.length > 0) {
      return models;
    }
  }
  if (typeof parsed === 'object' && parsed !== null && 'models' in parsed) {
    const value = (parsed as Record<string, JsonValue>).models;
    if (Array.isArray(value)) {
      const models: string[] = [];
      for (const item of value) {
        if (typeof item === 'string') {
          models.push(item);
        } else if (item !== null && typeof item === 'object' && 'id' in item) {
          const id = (item as Record<string, JsonValue>).id;
          if (typeof id === 'string') {
            models.push(id);
          }
        }
      }
      if (models.length > 0) {
        return models;
      }
    }
  }
  throw new Error('Model inventory response did not include a model list');
}

const outputSchema = z.object({
  baseUrl: z.string(),
  modelCount: z.number(),
  models: z.array(z.string()),
});

export default class AiModels extends Command {
  static description = 'List available AI models';
  static summary = 'List available AI models';

  static override flags = {
    baseUrl: Flags.string({
      description: 'API base URL',
      default: 'http://localhost:4040',
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<z.infer<typeof outputSchema>> {
    const { flags } = await this.parse(AiModels);

    let models: string[];
    try {
      const raw = await requestJson({
        baseUrl: flags.baseUrl,
        path: '/api/ai/models',
      });
      models = normalizeModels(raw);
    } catch (error) {
      this.error(
        error instanceof Error ? error.message : 'Failed to fetch models',
        {
          exit: 3,
          code: 'DEPENDENCY_RESPONSE_INVALID',
        }
      );
    }

    const output = {
      baseUrl: flags.baseUrl,
      modelCount: models.length,
      models,
    };

    validateWithZod(outputSchema, output);
    return output;
  }
}
