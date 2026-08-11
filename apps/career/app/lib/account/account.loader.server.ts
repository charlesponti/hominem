import { CertificationRepository, db, SocialLinksRepository } from '@hominem/db';
import type { CareerProfileRecord } from '@hominem/db';

import { logger } from '~/lib/logger';

import { listUserDocuments } from './documents.server';
import type { AccountDocumentFile, AccountPageUser, ProfileLoaderData } from './types';

async function listUserDocumentsSafely(userId: string): Promise<AccountDocumentFile[]> {
  try {
    return await listUserDocuments(userId);
  } catch (error) {
    logger.error('Failed to list account documents', error, { owner_userid: userId });
    return [];
  }
}

export async function loadProfilePageData({
  user,
  currentProfile,
}: {
  user: AccountPageUser;
  currentProfile: CareerProfileRecord;
}): Promise<ProfileLoaderData> {
  const [socialLinks, documents, certifications] = await Promise.all([
    SocialLinksRepository.get(db, user.id),
    listUserDocumentsSafely(user.id),
    CertificationRepository.list(db, user.id),
  ]);

  return {
    user,
    currentProfile,
    hasProfile: true,
    socialLinks,
    documents,
    certifications,
  };
}
