import { db, CareerRepository } from '@hominem/db';

import { fetchCareerProfile } from './api.server';
import type { User } from './auth.server';

/**
 * Every signed-in career user has one career profile.
 * If none exists, return null (profile is created via data migration, not on-the-fly like the old portfolio).
 */
export async function ensureUserHasProfile(request: Request, user: User): Promise<boolean> {
  const profile = await fetchCareerProfile(request);
  return profile !== null;
}

/**
 * Full profile context — profile + positions + education — for AI prompts and public display.
 */
export async function getFullCareerContext(ownerUserId: string) {
  const [profile, positions, education] = await Promise.all([
    CareerRepository.getProfile(db, ownerUserId),
    CareerRepository.listPositions(db, ownerUserId),
    CareerRepository.listEducation(db, ownerUserId, 50),
  ]);

  return {
    profile,
    positions,
    education,
  };
}

/**
 * Public career profile for sharing.
 */
export async function getPublicCareerProfile(ownerUserId: string) {
  const [profile, positions] = await Promise.all([
    CareerRepository.getProfile(db, ownerUserId),
    CareerRepository.listPositions(db, ownerUserId, { type: 'employment' }),
  ]);

  return { profile, positions };
}
