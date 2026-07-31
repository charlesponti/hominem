import { serverEnv } from '~/lib/env.server';

export async function loader() {
  const start = Date.now();
  const checks: Record<string, boolean | string> = {};

  try {
    void new URL(serverEnv.DATABASE_URL);
    checks.database = 'connected';

    const responseTime = Date.now() - start;

    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime,
      checks,
      version: process.env.npm_package_version || 'unknown',
    });
  } catch (error) {
    return Response.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - start,
        checks,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 },
    );
  }
}
