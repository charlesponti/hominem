import type { ComponentProps, MouseEvent } from 'react';
import { useCallback } from 'react';
import { Link } from 'react-router';

import { useRouteLoadingStore } from '../store/route-loading-store';

export function RouteLink({ onClick, ...props }: ComponentProps<typeof Link>) {
  const setIsRouteLoading = useRouteLoadingStore((state) => state.setIsRouteLoading);

  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      setIsRouteLoading(true);
      onClick?.(e);
    },
    [setIsRouteLoading, onClick],
  );

  return <Link onClick={handleClick} {...props} />;
}
