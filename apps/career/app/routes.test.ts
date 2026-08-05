import { describe, expect, it } from 'vitest';

import routes from './routes';

interface RouteConfigNode {
  path?: string;
  children?: RouteConfigNode[];
}

function flattenPaths(nodes: RouteConfigNode[]): string[] {
  return nodes.flatMap((node) => [
    ...(node.path ? [node.path] : []),
    ...flattenPaths(node.children ?? []),
  ]);
}

describe('route config', () => {
  it('registers the unified project routes and removes the nested work projects route', () => {
    const paths = flattenPaths(routes as RouteConfigNode[]);

    expect(paths).toContain('projects');
    expect(paths).toContain('projects/new');
    expect(paths).toContain('projects/:id');
    expect(paths).not.toContain('work/:id/projects');
  });
});
