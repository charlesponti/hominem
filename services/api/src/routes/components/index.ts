import { success, error } from '@hominem/services';
import { Hono } from 'hono';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { AppEnv } from '../../server';

export const componentsRoutes = new Hono<AppEnv>();

// Serve the use-api-client registry file
componentsRoutes.get('/use-api-client.json', async (c) => {
  try {
    const registryPath = join(process.cwd(), 'registry', 'use-api-client.json');
    const registryContent = await readFile(registryPath, 'utf-8');
    const registryData = JSON.parse(registryContent) as Record<string, unknown>;

    // Set appropriate headers for JSON response
    c.header('Content-Type', 'application/json');
    c.header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    return c.json(success(registryData), 200);
  } catch (err) {
    console.error('Error serving use-api-client registry:', err);
    return c.json(error('NOT_FOUND', 'Registry file not found'), 404);
  }
});

// List all available components
componentsRoutes.get('/', async (c) => {
  try {
    const components = [
      {
        name: 'use-api-client',
        title: 'API Client Hook',
        description:
          'React hook for API client that handles fetch requests with Supabase authentication',
        url: '/components/use-api-client.json',
      },
    ];

    c.header('Content-Type', 'application/json');
    c.header('Cache-Control', 'public, max-age=3600');

    return c.json(
      success({
        components,
        count: components.length,
      }),
      200,
    );
  } catch (err) {
    console.error('Error listing components:', err);
    return c.json(error('INTERNAL_ERROR', 'Failed to list components'), 500);
  }
});
