import { NotFoundError, InternalError } from '@hominem/services';
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

    return c.json(registryData);
  } catch (err) {
    console.error('Error serving use-api-client registry:', err);
    throw new NotFoundError('Registry file not found');
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

    return c.json({
      components,
      count: components.length,
    });
  } catch (err) {
    console.error('Error listing components:', err);
    throw new InternalError('Failed to list components');
  }
});
