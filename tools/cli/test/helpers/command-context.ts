export function createTestCommandContext() {
  return {
    cwd: process.cwd(),
    env: process.env,
    stdio: {
      out: process.stdout,
      err: process.stderr,
    },
    outputFormat: 'json' as const,
    quiet: false,
    verbose: false,
    interactive: false,
    telemetry: {
      requestId: 'test-request-id',
      startedAt: '2026-03-12T00:00:00.000Z',
    },
    abortSignal: new AbortController().signal,
  };
}
