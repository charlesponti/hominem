import { getFullCareerContext } from '../lib/portfolio.server';
import { Route } from './+types/api.portfolio.$userId';

export async function loader({ params }: Route.LoaderArgs) {
  try {
    const userId = params.owner_userid;
    const context = await getFullCareerContext(userId);
    return Response.json(context);
  } catch {
    return Response.json({ error: 'Failed to load career data' }, { status: 500 });
  }
}
