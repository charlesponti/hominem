import { Image as ImageIcon } from 'lucide-react'
import { memo, useCallback, useState } from 'react'
import { buildPlacePhotoUrl } from '~/lib/photo-utils'
import { cn } from '~/lib/utils'
import PlacePhotoLightbox from './PlacePhotoLightbox'

type Props = {
  alt: string
  photos: string[] | null | undefined
  placeId: string
}

const PlacePhotos = ({ alt, photos, placeId }: Props) => {
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set())
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

  const handleImageError = useCallback((index: number) => {
    setFailedImages((prev) => new Set(prev).add(index))
  }, [])

  const openLightbox = useCallback((index: number) => {
    setCurrentPhotoIndex(index)
    setLightboxOpen(true)
  }, [])

  if (!photos || photos.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center bg-linear-to-br from-indigo-50 to-purple-50 rounded-2xl">
        <div className="text-center">
          <ImageIcon className="w-16 h-16 text-indigo-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No photos available</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        className="w-full max-w-full flex gap-4 overflow-x-auto overflow-y-hidden pb-2 snap-x snap-mandatory scroll-smooth"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgb(249 249 249) transparent',
          scrollbarGutter: 'stable',
        }}
      >
        {photos.map((photoUrl, index) => {
          const hasFailed = failedImages.has(index)

          return (
            <button
              type="button"
              key={photoUrl}
              onClick={() => openLightbox(index)}
              className="shrink-0 snap-center group relative cursor-pointer w-[85vw] h-[85vw] max-w-[350px] max-h-[350px] sm:w-[350px] sm:h-[350px] aspect-square rounded-2xl overflow-hidden bg-gray-100 hover:scale-105 transition-all duration-300"
              aria-label={`View photo ${index + 1} of ${photos.length}`}
            >
              {hasFailed ? (
                <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-indigo-50 to-purple-50">
                  <div className="text-center">
                    <ImageIcon className="w-12 h-12 text-indigo-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-xs">Failed to load</p>
                  </div>
                </div>
              ) : (
                <img
                  src={buildPlacePhotoUrl(photoUrl, 800, 800)}
                  alt={`${alt} - ${index + 1}`}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  sizes="(max-width: 768px) 90vw, 350px"
                  style={
                    index === 0 ? { viewTransitionName: `place-photo-image-${placeId}` } : undefined
                  }
                  className={cn(
                    'object-cover w-full h-full transition-all duration-300 group-hover:scale-105'
                  )}
                  onError={() => handleImageError(index)}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Lightbox */}
      <PlacePhotoLightbox
        photos={photos}
        currentIndex={currentPhotoIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        alt={alt}
      />
    </>
  )
}

export default memo(PlacePhotos)
