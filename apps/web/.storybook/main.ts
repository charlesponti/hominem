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
      return plugin?.name?.includes('react-router') ? [] : [plugin];
    };
    config.plugins = config.plugins?.flatMap(removeReactRouterPlugin);
    config.resolve ??= {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '~': fileURLToPath(new URL('../app', import.meta.url)),
    };
    config.resolve.alias['@hominem/rpc'] = path.resolve(
      fileURLToPath(new URL('../../../packages/rpc', import.meta.url)),
      'src',
    );
    return config;
  },
};

export default config;
