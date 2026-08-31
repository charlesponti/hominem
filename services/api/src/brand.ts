import { BRAND } from '@hominem/env/brand';

// All the API's brand strings live here - don't hardcode them elsewhere.
export const API_BRAND = {
  appName: BRAND.appName,
  financeClientName: BRAND.financeClientName,
  api: {
    title: `${BRAND.appName} API`,
    description: `API for the ${BRAND.appName} notes, chat, files, and voice product`,
    contactName: `${BRAND.appName} Support`,
    docsTitle: `${BRAND.appName} API Documentation`,
  },
} as const;
