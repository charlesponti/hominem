import { Image as ImageIcon } from 'lucide-react'
import { memo, useCallback, useState } from 'react'
import { env } from '~/lib/env'
import { cn } from '~/lib/utils'
import PlacePhotoLightbox from './PlacePhotoLightbox'

type Props = {
  alt: string
  photos: string[] | null | undefined
}

const getImageSize = (photoUrl: string, width = 600, height = 400): string => {
  if (photoUrl.includes('places/') && photoUrl.includes('/photos/')) {
    return `https://places.googleapis.com/v1/${photoUrl}/media?key=${env.VITE_GOOGLE_API_KEY}&maxWidthPx=${width}&maxHeightPx=${height}`
  }

  if (photoUrl.includes('googleusercontent')) {
    return `${photoUrl}=w${width}-h${height}-c`
  }
  return photoUrl
}

const PlacePhotos = ({ alt, photos }: Props) => {
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
      <div className="relative">
        <div
          className="flex pb-2 gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(156, 163, 175, 1) transparent' }}
        >
          {photos.map((photoUrl, index) => {
            const hasFailed = failedImages.has(index)

            return (
              <button
                type="button"
                key={photoUrl}
                onClick={() => openLightbox(index)}
                className="shrink-0 snap-center group relative cursor-pointer"
                aria-label={`View photo ${index + 1} of ${photos.length}`}
              >
                <div className="w-[500px] h-[350px] relative rounded-2xl overflow-hidden hover:scale-3d transition-all duration-300">
                  {hasFailed ? (
                    <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-indigo-50 to-purple-50">
                      <div className="text-center">
                        <ImageIcon className="w-12 h-12 text-indigo-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-xs">Failed to load</p>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={getImageSize(photoUrl, 800, 560)}
                      alt={`${alt} - ${index + 1}`}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      sizes="(max-width: 768px) 90vw, 500px"
                      className={cn(
                        'absolute inset-0 object-cover w-full h-full transition-all duration-300 group-hover:scale-105'
                      )}
                      onError={() => handleImageError(index)}
                    />
                  )}
                </div>
              </button>
            )
          })}
        </div>
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
