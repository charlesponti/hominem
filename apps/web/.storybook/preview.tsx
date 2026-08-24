import type { Preview } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, passthrough } from 'msw';
import { mswLoader } from 'msw-storybook-addon/csf3';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';

import { TooltipProvider } from '~/components/ui/tooltip';
import { HonoProvider } from '~/lib/api/provider';

import '../app/styles/globals.css';

function Providers({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <HonoProvider baseUrl="/">
          <TooltipProvider>{children}</TooltipProvider>
        </HonoProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

const preview: Preview = {
  loaders: [mswLoader()],
  decorators: [
    (Story) => (
      <Providers>
        <Story />
      </Providers>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
    msw: {
      handlers: [http.get('/rive/mana-2.0.riv', () => passthrough())],
    },
  },
};

export default preview;
