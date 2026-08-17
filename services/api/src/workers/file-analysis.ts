import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';

import { createChatCompletion, getChatCompletionText, getChatCompletionUsage } from '@hominem/ai';
import { recordAIUsageEvent, startAIUsageTimer } from '@hominem/services';
import { LOG_MESSAGES, logger } from '@hominem/telemetry';

const MAX_IMAGE_ANALYSIS_BYTES = 20 * 1024 * 1024;
const DOCUMENT_SUMMARY_THRESHOLD = 1000;
const DOCUMENT_SUMMARY_INPUT_LIMIT = 10_000;

/**
 * Generates an AI description of an image for use as chat context.
 * Returns an empty string (rather than throwing) on failure, so callers can
 * fall back to storing the file without a description.
 */
export async function describeImageForChat(
  buffer: ArrayBuffer,
  mimetype: string,
  fileId: string,
  userId: string,
): Promise<string> {
  if (buffer.byteLength >= MAX_IMAGE_ANALYSIS_BYTES) return '';

  const eventId = randomUUID();
  const getDurationMs = startAIUsageTimer();
  try {
    const base64Image = Buffer.from(buffer).toString('base64');
    const response = await createChatCompletion({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please describe this image in detail. Focus on key elements, text, and context that would be useful for answering questions about it.',
            },
            {
              type: 'image_url',
              imageUrl: { url: `data:${mimetype};base64,${base64Image}` },
            },
          ],
        },
      ],
      maxTokens: 500,
    });
    await recordAIUsageEvent({
      eventId,
      userId,
      feature: 'file_image_analyze',
      operation: 'chat_completion',
      usage: getChatCompletionUsage(response),
      model: response.model,
      status: 'succeeded',
      durationMs: getDurationMs(),
      metadata: { fileId, mimeType: mimetype, sizeBytes: buffer.byteLength },
    });
    return getChatCompletionText(response);
  } catch (error) {
    await recordAIUsageEvent({
      eventId,
      userId,
      feature: 'file_image_analyze',
      operation: 'chat_completion',
      status: 'failed',
      error,
      durationMs: getDurationMs(),
      metadata: { fileId, mimeType: mimetype, sizeBytes: buffer.byteLength },
    });
    logger.warn(LOG_MESSAGES.IMAGE_ANALYZE_ERROR, { error });
    return '';
  }
}

/**
 * Summarizes extracted document text for use as chat context. Returns an
 * empty string for short documents (not worth summarizing) or on failure.
 */
export async function summarizeDocumentForChat(
  textContent: string,
  fileId: string,
  mimetype: string,
  userId: string,
): Promise<string> {
  if (textContent.length <= DOCUMENT_SUMMARY_THRESHOLD) return '';

  const eventId = randomUUID();
  const getDurationMs = startAIUsageTimer();
  try {
    const response = await createChatCompletion({
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that summarizes documents. Provide a concise summary highlighting the key points and main topics.',
        },
        {
          role: 'user',
          content: `Please summarize this document:\n\n${textContent.slice(0, DOCUMENT_SUMMARY_INPUT_LIMIT)}${
            textContent.length > DOCUMENT_SUMMARY_INPUT_LIMIT ? '...' : ''
          }`,
        },
      ],
      maxTokens: 300,
    });
    await recordAIUsageEvent({
      eventId,
      userId,
      feature: 'file_document_summarize',
      operation: 'chat_completion',
      usage: getChatCompletionUsage(response),
      model: response.model,
      status: 'succeeded',
      durationMs: getDurationMs(),
      metadata: {
        fileId,
        mimeType: mimetype,
        extractedCharacterCount: textContent.length,
      },
    });
    return getChatCompletionText(response);
  } catch (error) {
    await recordAIUsageEvent({
      eventId,
      userId,
      feature: 'file_document_summarize',
      operation: 'chat_completion',
      status: 'failed',
      error,
      durationMs: getDurationMs(),
      metadata: {
        fileId,
        mimeType: mimetype,
        extractedCharacterCount: textContent.length,
      },
    });
    logger.warn(LOG_MESSAGES.DOCUMENT_SUMMARIZE_ERROR, { error });
    return '';
  }
}
