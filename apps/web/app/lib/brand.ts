import { BRAND } from '@hominem/env/brand';

export const WEB_BRAND = {
  appName: BRAND.appName,
  logoPath: '/logo.web.png',
  meta: {
    title: BRAND.appName,
    description: BRAND.tagline,
  },
  marketing: {
    title: BRAND.appName,
    kicker: BRAND.appName,
    ctaLabel: `Open ${BRAND.appName}`,
  },
  manifest: {
    name: BRAND.appName,
    shortName: BRAND.appName,
    description: `${BRAND.appName} brings notes, voice capture, and chat into one workspace.`,
  },
} as const;
