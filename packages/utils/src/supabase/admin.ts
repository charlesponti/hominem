import type { SupabaseClient } from '@supabase/supabase-js';

import { createClient } from '@supabase/supabase-js';

/**
 * Supabase admin client management
 *
 * Consuming apps can call `initSupabaseAdmin({ supabaseUrl, supabaseServiceRoleKey })`
 * to provide credentials programmatically. If not initialized explicitly, the
 * implementation will fall back to environment variables for backward
 * compatibility.
 */

let supabaseAdminClient: SupabaseClient | null = null;

function createMissingClientProxy(message?: string) {
  const errMsg =
    message ||
    'Missing required Supabase credentials. Provide them to initSupabaseAdmin() or set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env';

  // Return a proxy that throws when any property is accessed, deferring the error
  // until the client is actually used. This prevents import-time exceptions
  // which break test runs that don't provide env values.
  return new Proxy(
    {},
    {
      get() {
        throw new Error(errMsg);
      },
      apply() {
        throw new Error(errMsg);
      },
      construct() {
        throw new Error(errMsg);
      },
    },
  ) as unknown as SupabaseClient;
}

export function initSupabaseAdmin(options?: {
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
}): SupabaseClient {
  const supabaseUrl =
    options?.supabaseUrl ?? process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseServiceRoleKey =
    options?.supabaseServiceRoleKey ??
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!(supabaseUrl && supabaseServiceRoleKey)) {
    // Don't throw at import time; return a proxy that throws when used.
    supabaseAdminClient = createMissingClientProxy();
    return supabaseAdminClient;
  }

  supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdminClient;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminClient) {
    // Try to lazily initialize from environment for compatibility.
    const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const supabaseServiceRoleKey =
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseServiceRoleKey) {
      supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      return supabaseAdminClient;
    }

    // If credentials are missing, return a proxy that will surface an error
    // only when the client is actually used.
    supabaseAdminClient = createMissingClientProxy();
  }

  return supabaseAdminClient;
}
