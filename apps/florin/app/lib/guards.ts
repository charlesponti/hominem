import { getServerAuth } from "@hominem/auth/server";

/**
 * Require authentication - throws 401 if not authenticated
 * Returns headers that MUST be included in the response
 */
export async function requireAuth(request: Request) {
  const auth = await getServerAuth(request);

  if (!auth.user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return { user: auth.user, headers: auth.headers };
}
