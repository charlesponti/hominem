import { logger, LOG_MESSAGES } from '@hominem/telemetry';
import { serve } from '@hono/node-server';
import { WebSocketServer } from 'ws';

import { env } from './env';
import { initRuntime } from './runtime';
import { createServer } from './server';

if (env.HOMINEM_AI_PROVIDER === 'scripted') {
  if (env.NODE_ENV === 'production') {
    throw new Error('HOMINEM_AI_PROVIDER=scripted is not allowed in production');
  }
  const { installOpenRouterMock } = await import('./testkit/openrouter.mock');
  installOpenRouterMock();
}

if (env.HOMINEM_EMAIL_PROVIDER === 'scripted') {
  if (env.NODE_ENV === 'production') {
    throw new Error('HOMINEM_EMAIL_PROVIDER=scripted is not allowed in production');
  }
}

// Explicit HOMINEM_EMAIL_PROVIDER wins. Otherwise production always sends
// real email (the Dockerfile bakes NODE_ENV=production on every deployed
// host, including previews) while any other NODE_ENV captures to the
// scripted mailbox instead of sending — local dev never sends real email by
// accident. Set HOMINEM_EMAIL_PROVIDER=resend explicitly to test real
// delivery locally.
const emailProvider =
  env.HOMINEM_EMAIL_PROVIDER ?? (env.NODE_ENV === 'production' ? 'resend' : 'scripted');

logger.info(LOG_MESSAGES.EMAIL_PROVIDER, {
  provider: emailProvider,
  source: env.HOMINEM_EMAIL_PROVIDER ? 'explicit' : 'inferred',
});

if (emailProvider === 'scripted') {
  const { installResendMock } = await import('./testkit/resend.mock');
  const { resolveScriptedMailboxPath } = await import('@hominem/utils/scripted-mailbox');
  installResendMock({ mailboxFile: resolveScriptedMailboxPath(env.HOMINEM_SCRIPTED_MAILBOX) });
}

const app = createServer();
const port = env.PORT ?? 4040;
const host = '0.0.0.0';
const websocketServer = new WebSocketServer({ noServer: true });

logger.info(LOG_MESSAGES.SERVER_STARTED, { host, port });

serve({
  fetch: app.fetch,
  port,
  hostname: host,
  websocket: { server: websocketServer },
  overrideGlobalObjects: false,
});

initRuntime('api').installSignalHandlers();
