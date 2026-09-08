interface ApiErrorBody {
  error?: unknown;
  message?: unknown;
}

interface ApiResponseLike {
  json: () => Promise<unknown>;
}

export async function parseApiError(response: ApiResponseLike): Promise<ApiErrorBody> {
  const body: unknown = await response.json().catch(() => null);
  if (!isObject(body)) {
    return {};
  }
  return body as ApiErrorBody;
}
import { isObject } from '@hominem/utils';
