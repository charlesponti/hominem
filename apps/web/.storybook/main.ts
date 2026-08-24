import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../app/**/*.stories.@(ts|tsx)'],
  addons: ['msw-storybook-addon'],
  framework: '@storybook/react-vite',
  staticDirs: ['../public'],
  viteFinal: async (config) => {
    const removeReactRouterPlugin = (
      plugin: NonNullable<typeof config.plugins>[number],
    ): NonNullable<typeof config.plugins> => {
      if (Array.isArray(plugin)) {
        return plugin.flatMap(removeReactRouterPlugin);
      }
      if (
        plugin &&
        typeof plugin === 'object' &&
        'name' in plugin &&
        typeof plugin.name === 'string' &&
        plugin.name.includes('react-router')
      ) {
        return [];
      }
      return [plugin];
    };
    config.plugins = config.plugins?.flatMap(removeReactRouterPlugin);
    config.resolve ??= {};
    const aliases = config.resolve.alias;
    config.resolve.alias = {
      ...(aliases && typeof aliases === 'object' && !Array.isArray(aliases) ? aliases : {}),
      '~': fileURLToPath(new URL('../app', import.meta.url)),
      '@hominem/rpc': path.resolve(
        fileURLToPath(new URL('../../../packages/rpc', import.meta.url)),
        'src',
      ),
    };
    return config;
  },
};

export default config;
