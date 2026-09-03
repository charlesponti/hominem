interface ApiErrorBody {
  error?: unknown;
  message?: unknown;
}

interface ApiResponseLike {
  json: () => Promise<unknown>;
}

export async function parseApiError(response: ApiResponseLike): Promise<ApiErrorBody> {
  const body: unknown = await response.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return {};
  }
  return body as ApiErrorBody;
}
