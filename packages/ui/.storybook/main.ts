import type { StorybookConfig } from '@storybook/react-vite'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

const config: StorybookConfig = {
  staticDirs: ['../public'],
  stories: [
    '../src/**/*.stories.@(ts|tsx)',
    '../../finance-react/src/**/*.stories.@(ts|tsx)',
    '../../places-react/src/**/*.stories.@(ts|tsx)',
    '../../lists-react/src/**/*.stories.@(ts|tsx)',
    '../../invites-react/src/**/*.stories.@(ts|tsx)',
  ],
  addons: ['@storybook/addon-docs', '@storybook/addon-vitest'],
  framework: {
    name: '@storybook/react-vite',
    options: {
      reactDocgenTypescriptOptions: {
        propFilter: (prop) =>
          prop.parent ? !prop.parent.fileName.includes('node_modules') : true,
      },
    },
  },
  docs: { autodocs: 'tag' },
  viteFinal: async (config) => {
    config.plugins = [tailwindcss(), tsconfigPaths(), ...(config.plugins ?? [])]
    return config
  },
}

export default config
