import { BRAND } from '@hominem/env/brand';

/** Single source of truth for the API service brand strings. */
export const API_BRAND = {
  appName: BRAND.appName,
  financeClientName: `${BRAND.appName} Finance`,
  api: {
    title: `${BRAND.appName} API`,
    description: `API for the ${BRAND.appName} notes-first personal workspace`,
    contactName: `${BRAND.appName} Support`,
    docsTitle: `${BRAND.appName} API Documentation`,
  },
} as const;
