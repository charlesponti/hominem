import { Loading } from '@hominem/ui/loading';
import { lazy, Suspense } from 'react';

import type { RoccoMapProps } from './map';

const RoccoMap = lazy(() => import('./map'));

const MapPlaceholder = () => (
  <div className="flex flex-1 relative overflow-hidden size-full border border-border">
    <div className="flex items-center justify-center max-w-[300px] mx-auto min-h-full">
      <Loading size="xl" />
    </div>
  </div>
);

const LazyMap = (props: RoccoMapProps) => {
  return (
    <Suspense fallback={<MapPlaceholder />}>
      <RoccoMap {...props} />
    </Suspense>
  );
};

export default LazyMap;
