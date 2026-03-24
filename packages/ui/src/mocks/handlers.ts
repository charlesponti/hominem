import { http, HttpResponse } from 'msw';

/**
 * Base API handlers for Storybook.
 *
 * These are the default fallback handlers. Individual stories can override
 * specific routes via `parameters.msw.handlers` in the story definition.
 *
 * Example in a story:
 * ```ts
 * export const WithData: Story = {
 *   parameters: {
 *     msw: {
 *       handlers: [
 *         http.get('http://localhost:3000/api/places', () =>
 *           HttpResponse.json({ data: mockPlaces })
 *         ),
 *       ],
 *     },
 *   },
 * }
 * ```
 */
export const handlers = [
  // Default fallback: return empty lists for common collection endpoints
  http.get('http://localhost:3000/api/lists', () => HttpResponse.json({ data: [] })),
  http.get('http://localhost:3000/api/places', () => HttpResponse.json({ data: [] })),
  http.get('http://localhost:3000/api/invites', () => HttpResponse.json({ data: [] })),
  http.get('http://localhost:3000/api/finance/accounts', () => HttpResponse.json({ data: [] })),
  http.get('http://localhost:3000/api/finance/transactions', () => HttpResponse.json({ data: [] })),
  http.get('http://localhost:3000/api/user', () =>
    HttpResponse.json({
      id: 'storybook-user',
      email: 'dev@example.com',
      name: 'Storybook User',
    }),
  ),
];
