import type { Route } from './+types/home-view';

export async function loader({ request }: Route.LoaderArgs) {
  const { requireAuth } = await import('~/lib/guards');
  await requireAuth(request);
}

export default function FocusView() {
  return <div className="bg-background" />;
}
