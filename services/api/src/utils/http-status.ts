import type { ContentfulStatusCode } from 'hono/utils/http-status';

export function isContentfulStatusCode(statusCode: number): statusCode is ContentfulStatusCode {
  return statusCode >= 100 && statusCode <= 599;
}
