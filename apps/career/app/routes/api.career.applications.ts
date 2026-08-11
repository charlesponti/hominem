import { data } from 'react-router';

import { getApplicationCards } from '~/lib/career/queries/job-applications.server';
import { logger } from '~/lib/logger';
import { userContext } from '~/lib/middleware';

import { Route } from './+types/api.career.applications';

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  if (!user) {
    return data({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const applications = await getApplicationCards(user.id);
    return data({ applications });
  } catch (error) {
    logger.error('Error loading applications', error, { owner_userid: user.id });
    return data({ error: 'Failed to load applications' }, { status: 500 });
  }
}
