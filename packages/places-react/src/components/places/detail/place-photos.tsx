import { cn } from '@hominem/ui/lib/utils';
import { Image as ImageIcon } from 'lucide-react';
import { memo, useCallback, useState } from 'react';

interface PlacePhotosProps {
  alt: string;
  photos?: string[] | null;
  thumbnailPhotos?: string[] | null;
  placeId: string;
}

export function PlacePhotos({ alt, photos, thumbnailPhotos, placeId }: PlacePhotosProps) {
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  const displayPhotos = thumbnailPhotos || photos || [];

  const handleImageError = useCallback((index: number) => {
    setFailedImages((prev) => new Set(prev).add(index));
  }, []);

  if (!displayPhotos || displayPhotos.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center border border-dashed border-border">
        <div className="text-center">
          <ImageIcon className="w-16 h-16 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No photos available</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="w-full max-w-full flex gap-4 overflow-x-auto overflow-y-hidden pb-2 snap-x snap-mandatory scroll-smooth"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 255, 255, 0.3) transparent',
          scrollbarGutter: 'stable',
        }}
      >
        {displayPhotos.map((photoUrl, index) => {
          const hasFailed = failedImages.has(index);

          return (
            <div
              key={photoUrl}
              className="shrink-0 snap-center group relative h-[85vw] w-[85vw] max-h-[350px] max-w-[350px] overflow-hidden border border-border sm:h-[350px] sm:w-[350px]"
            >
              {hasFailed ? (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <div className="text-center">
                    <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-xs">Failed to load</p>
                  </div>
                </div>
              ) : (
                <img
                  src={photoUrl || ''}
                  alt={`${alt} - ${index + 1}`}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  sizes="(max-width: 768px) 90vw, 350px"
                  style={
                    index === 0 ? { viewTransitionName: `place-photo-image-${placeId}` } : undefined
                  }
                  className={cn('object-cover w-full h-full')}
                  onError={() => handleImageError(index)}
                />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export default memo(PlacePhotos);
