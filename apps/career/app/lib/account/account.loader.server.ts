import { CareerRepository, db, SocialLinksRepository } from '@hominem/db';
import type { CareerProfileRecord } from '@hominem/db';

import { listUserDocuments } from './documents.server';
import type { AccountLoaderData, AccountPageUser } from './types';

export async function loadAccountPageData({
  user,
  currentProfile,
}: {
  user: AccountPageUser;
  currentProfile: CareerProfileRecord;
}): Promise<AccountLoaderData> {
  const [socialLinks, documents] = await Promise.all([
    SocialLinksRepository.get(db, user.id),
    listUserDocuments(user.id),
  ]);

  return {
    user,
    currentProfile,
    hasProfile: true,
    socialLinks,
    documents,
  };
}
