// Deprecated: tRPC context removed
// Context is now managed by Hono middleware

export interface Context {
  request?: Request;
}

export async function createContext(request?: Request): Promise<Context> {
  return { request };
}
