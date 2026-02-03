export type HonoClient = { api: any };
export type HonoClientInstance = HonoClient;

export type HonoClientOptions = {
  fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

export type CreateClient = (baseUrl: string, options?: HonoClientOptions) => HonoClientInstance;

export interface ClientConfig {
  baseUrl: string;
  getAuthToken: () => Promise<string | null>;
  createClient: CreateClient;
  onError?: (error: Error) => void;
}

// Factory to create a configured Hono client with auth + error handling.
export function createHonoClient(config: ClientConfig): HonoClientInstance {
  return config.createClient(config.baseUrl, {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = await config.getAuthToken();
      const headers = new Headers(init?.headers);

      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      try {
        const response = await fetch(input, {
          ...init,
          headers,
          credentials: 'include',
        });

        // Throw on non-OK responses so React Query can handle them as errors
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
          const errorMessage = errorData.error || `Request failed with status ${response.status}`;
          throw new Error(errorMessage);
        }

        return response;
      } catch (error: unknown) {
        if (config.onError && error instanceof Error) {
          config.onError(error);
        }
        throw error;
      }
    },
  });
}
