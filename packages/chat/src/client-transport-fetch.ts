export type ChatClientTransportRequest = {
  url: string;
  init: RequestInit;
  signal?: AbortSignal;
};

export type ChatClientTransport = {
  request: (input: ChatClientTransportRequest) => Promise<Response>;
};

export const fetchChatTransport = (fetchImpl: typeof fetch = fetch): ChatClientTransport => ({
  request: ({ url, init, signal }) => fetchImpl(url, { ...init, signal }),
});
