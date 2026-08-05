import type { Selectable } from 'kysely';

import type { DbHandle } from '../../transaction';
import type { AppCareerSocialLinks } from '../../types/database';

export type CareerSocialLinksRecord = Selectable<AppCareerSocialLinks>;

export type CareerSocialLinksInput = {
  github?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  website?: string | null;
};

export const SocialLinksRepository = {
  async get(handle: DbHandle, ownerUserId: string): Promise<CareerSocialLinksRecord | null> {
    const result = await handle
      .selectFrom('app.careerSocialLinks')
      .selectAll()
      .where('ownerUserid', '=', ownerUserId)
      .executeTakeFirst();
    return (result ?? null) as CareerSocialLinksRecord | null;
  },

  async save(
    handle: DbHandle,
    ownerUserId: string,
    links: CareerSocialLinksInput,
  ): Promise<CareerSocialLinksRecord> {
    return handle
      .insertInto('app.careerSocialLinks')
      .values({ ownerUserid: ownerUserId, ...links })
      .onConflict((oc) => oc.column('ownerUserid').doUpdateSet(links))
      .returningAll()
      .executeTakeFirstOrThrow() as Promise<CareerSocialLinksRecord>;
  },
};
