import { describe, expect, it } from 'vitest';

import { WEB_BRAND } from './brand';

describe('WEB_BRAND', () => {
  it('uses Hakumi as the public app name', () => {
    expect(WEB_BRAND.appName).toBe('Hakumi');
  });

  it('keeps web metadata aligned with the Hakumi product brand', () => {
    expect(WEB_BRAND.manifest.name).toBe('Hakumi');
    expect(WEB_BRAND.manifest.shortName).toBe('Hakumi');
    expect(WEB_BRAND.meta.title).toBe('Hakumi');
    expect(WEB_BRAND.marketing.title).toBe('Hakumi');
  });

  it('points update UI at the shared Hakumi web logo asset', () => {
    expect(WEB_BRAND.logoPath).toBe('/logo.png');
  });
});
