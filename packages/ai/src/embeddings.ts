import { type CreateEmbeddingsResponseBody } from '@openrouter/sdk/models/operations';

import {
  EMBEDDING_MODEL,
  createOpenRouterClient,
  normalizeOpenRouterEmbeddingUsage,
  normalizeOpenRouterError,
  type EmbeddingOptions,
} from './shared';

export async function generateEmbedding(content: string, options: EmbeddingOptions = {}) {
  try {
    const model = options.model ?? EMBEDDING_MODEL;
    const client = createOpenRouterClient(options);
    const response = await client.embeddings.generate({
      httpReferer: options.httpReferer,
      appTitle: options.appTitle,
      appCategories: options.appCategories,
      requestBody: {
        model,
        input: content,
        inputType: options.inputType ?? 'search_document',
        dimensions: options.dimensions,
        encodingFormat: 'float',
      },
    });
    const embeddingResponse: CreateEmbeddingsResponseBody =
      typeof response === 'string' ? JSON.parse(response) : response;

    const embedding = embeddingResponse.data?.[0]?.embedding;

    return {
      embedding: Array.isArray(embedding) ? embedding : [],
      usage: normalizeOpenRouterEmbeddingUsage(model, embeddingResponse.usage),
    };
  } catch (error) {
    throw normalizeOpenRouterError(error);
  }
}
