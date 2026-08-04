import { CareerRepository, db } from '@hominem/db';

import { logger } from '~/lib/logger';

import { Route } from './+types/p.$slug';

export async function loader({ params }: Route.LoaderArgs) {
  // Public profiles no longer use slugs. The new schema uses user IDs.
  // Deprecated: return a minimal response.
  try {
    // For now, all positions for any user are accessible via API endpoints.
    // The slug-based public profile is deprecated.
    return { positions: [], profile: null };
  } catch (error) {
    logger.error('Error loading public profile', error);
    throw new Response('Profile not found', { status: 404 });
  }
}

export const meta: Route.MetaFunction = ({ params }) => [{ title: `${params.slug} | career` }];

export default function PublicProfilePage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h1 className="heading-2">Profile Not Available</h1>
      <p className="body-2 text-muted-foreground mt-2">
        Public profiles are being rebuilt. Check back soon.
      </p>
    </div>
  );
}
