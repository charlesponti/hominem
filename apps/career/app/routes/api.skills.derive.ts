import { CareerRepository, db, runInTransaction, SkillRepository } from '@hominem/db';
import { data } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';

import { logger } from '~/lib/logger';
import { userContext } from '~/lib/middleware';
import { deriveSkillsFromCareerHistory } from '~/lib/services/skills-derivation.service';

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return data({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  const user = context.get(userContext);
  if (!user) {
    return data({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await CareerRepository.getProfile(db, user.id);
  if (!profile) {
    return data({ success: false, error: 'No profile found.' }, { status: 404 });
  }

  let derived: Awaited<ReturnType<typeof deriveSkillsFromCareerHistory>>;
  try {
    derived = await deriveSkillsFromCareerHistory(user.id, profile.id);
  } catch (error) {
    logger.error('Skills derivation failed', error, {
      owner_userid: user.id,
      profileId: profile.id,
    });
    return data({ success: false, error: 'Failed to derive skills. Try again.' }, { status: 500 });
  }

  if (derived.length === 0) {
    return data(
      {
        success: false,
        error: 'No skills could be derived. Add some work experience or projects first.',
      },
      { status: 422 },
    );
  }

  try {
    await runInTransaction((tx) =>
      SkillRepository.replaceSkills(
        tx,
        user.id,
        derived.map((skill) => ({
          name: skill.name,
          category: skill.category,
          level: skill.level,
          aiDerived: true,
          proof: skill.proof,
        })),
      ),
    );
  } catch (error) {
    logger.error('Failed to save derived skills', error, {
      owner_userid: user.id,
      profileId: profile.id,
    });
    return data({ success: false, error: 'Failed to save skills. Try again.' }, { status: 500 });
  }

  return data({ success: true, skills: derived });
}
