import { logger } from '@hominem/telemetry';

/**
 * Log redaction activity — when sensitive fields are excluded from responses.
 */
export function logRedaction(toolName: string, redactedFields: string[], recordCount: number) {
  if (redactedFields.length === 0) return;
  if (process.env.NODE_ENV === 'test') return;

  logger.info('[mcp] evidence redaction applied', {
    tool: toolName,
    redactedFields,
    recordCount,
  });
}
