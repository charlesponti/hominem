import { Image as ImageIcon } from 'lucide-react';
import { memo, useCallback, useState } from 'react';

import { cn } from '~/lib/utils';

import PlacePhotoLightbox from './PlacePhotoLightbox';

type Props = {
  alt: string;
  // Raw photo references or resolved URLs
  photos?: string[] | null;
  // Pre-proxied URLs from legacy RPC source
  thumbnailPhotos?: string[] | null;
  fullPhotos?: string[] | null;
  placeId: string;
};

const PlacePhotos = ({ alt, photos, thumbnailPhotos, fullPhotos, placeId }: Props) => {
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Fallback to raw photos if display urls aren't provided (unlikely with latest RPC implementation)
  const displayPhotos = thumbnailPhotos || photos || [];
  const lightboxPhotos = fullPhotos || photos || [];

  const handleImageError = useCallback((index: number) => {
    setFailedImages((prev) => new Set(prev).add(index));
  }, []);

  const openLightbox = useCallback((index: number) => {
    setCurrentPhotoIndex(index);
    setLightboxOpen(true);
  }, []);

  if (!displayPhotos || displayPhotos.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center border border-dashed border-border rounded-2xl">
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
            <button
              type="button"
              key={photoUrl}
              onClick={() => openLightbox(index)}
              className="shrink-0 snap-center group relative cursor-pointer w-[85vw] h-[85vw] max-w-[350px] max-h-[350px] sm:w-[350px] sm:h-[350px] aspect-square rounded-2xl overflow-hidden border border-border hover:scale-105 transition-all duration-300"
              aria-label={`View photo ${index + 1} of ${displayPhotos.length}`}
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
                  className={cn(
                    'object-cover w-full h-full transition-all duration-300 group-hover:scale-105',
                  )}
                  onError={() => handleImageError(index)}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Lightbox */}
      <PlacePhotoLightbox
        photos={lightboxPhotos.filter((p): p is string => Boolean(p))}
        currentIndex={currentPhotoIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        alt={alt}
      />
    </>
  );
};

export default memo(PlacePhotos);
