import { CareerRepository, db } from '@hominem/db';
import { data } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { logger } from '../lib/logger';
import { createErrorResponse, createSuccessResponse } from '../lib/route-utils';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');
  const currentProfileId = url.searchParams.get('currentId');

  if (!slug) {
    return data(createErrorResponse('Slug parameter is required'), { status: 400 });
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return data(
      createErrorResponse('Slug can only contain lowercase letters, numbers, and hyphens'),
      { status: 400 },
    );
  }

  if (slug.length < 3) {
    return data(createErrorResponse('Slug must be at least 3 characters long'), {
      status: 400,
    });
  }

  if (slug.length > 50) {
    return data(createErrorResponse('Slug must be less than 50 characters long'), {
      status: 400,
    });
  }

  try {
    const isAvailable = await CareerRepository.isSlugAvailable(
      db,
      slug,
      currentProfileId || undefined,
    );

    return createSuccessResponse({
      slug,
      isAvailable,
      message: isAvailable ? 'Slug is available' : 'Slug is already taken',
    });
  } catch (error) {
    logger.error('Error checking slug availability', error, { slug, currentProfileId });
    return data(createErrorResponse('Failed to check slug availability'), { status: 500 });
  }
}
