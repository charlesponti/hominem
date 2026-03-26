import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import tsconfigPaths from 'vite-tsconfig-paths';

const config: StorybookConfig = {
  staticDirs: ['../public'],
  stories: [
    '../src/**/*.stories.@(ts|tsx)',
    '../../finance-react/src/**/*.stories.@(ts|tsx)',
    '../../places-react/src/**/*.stories.@(ts|tsx)',
    '../../lists-react/src/**/*.stories.@(ts|tsx)',
    '../../invites-react/src/**/*.stories.@(ts|tsx)',
  ],
  addons: [getAbsolutePath("@storybook/addon-docs"), getAbsolutePath("@storybook/addon-vitest")],
  framework: {
    name: getAbsolutePath("@storybook/react-vite"),
    options: {},
  },
  docs: {
    defaultName: 'Documentation',
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      propFilter: (prop) =>
        prop.parent ? !prop.parent.fileName.includes('node_modules') : true,
    },
  },
  viteFinal: async (config) => {
    config.plugins = [tailwindcss(), tsconfigPaths(), ...(config.plugins ?? [])]
    return config
  },
}

export default config

function getAbsolutePath(value: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
