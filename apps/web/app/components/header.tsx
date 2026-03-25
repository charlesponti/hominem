import { Header } from '@hominem/ui';

import { WEB_BRAND } from '~/lib/brand';

export default function NotesHeader() {
  return (
    <Header
      brandIcon={
        <img
          src={WEB_BRAND.logoPath}
          alt={WEB_BRAND.appName}
          className="size-6 rounded-md object-cover"
        />
      }
    />
  );
}
