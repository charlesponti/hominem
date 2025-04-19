import type { ReactRouterConfig } from 'react-router'

const routerConfig: ReactRouterConfig = {
  future: {
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_prependBasename: true
  },
  routes: [],
  disableUseTransition: true,
  enableStaticSuspense: false,
  basename: '/'
};

export default routerConfig;