import { RouteLink as DsRouteLink } from '@ponti-studios/ui/navigation';
import { Link } from 'react-router';

import { useRouteLoadingStore } from '../store/route-loading-store';

export function RouteLink(props: React.ComponentProps<typeof DsRouteLink>) {
  const setIsRouteLoading = useRouteLoadingStore((state) => state.setIsRouteLoading);

  return <DsRouteLink as={Link} onNavigate={() => setIsRouteLoading(true)} {...props} />;
}
