import { Image as ImageIcon } from 'lucide-react'
import { memo, useCallback, useState } from 'react'
import { env } from '~/lib/env'
import { cn } from '~/lib/utils'

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

const PhotoSkeleton = () => (
  <div className="flex-shrink-0 w-80 h-48 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse rounded-lg flex items-center justify-center">
    <ImageIcon className="w-8 h-8 text-gray-400" />
  </div>
)

const PlacePhotos = ({ alt, photos }: Props) => {
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set())
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set())

  const handleImageLoad = useCallback((index: number) => {
    console.log('handleImageLoad', index)
    setLoadedImages((prev) => new Set(prev).add(index))
  }, [])

  const handleImageError = useCallback((index: number) => {
    console.log('handleImageError', index)
    setFailedImages((prev) => new Set(prev).add(index))
  }, [])

  if (!photos || photos.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg">
        <div className="text-center">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No photos available</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-4 overflow-x-auto h-full p-4 pb-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {photos.map((photoUrl, index) => {
          const isLoaded = loadedImages.has(index)
          const hasFailed = failedImages.has(index)

          return (
            <div key={photoUrl} className="flex-shrink-0 w-80 h-48 relative">
              {hasFailed ? (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg">
                  <div className="text-center">
                    <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                    <p className="text-gray-500 text-xs">Failed to load</p>
                  </div>
                </div>
              ) : (
                <>
                  <img
                    src={getImageSize(photoUrl, 600, 400)}
                    alt={`${alt} - ${index + 1}`}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    sizes="(max-width: 768px) 75vw, 600px"
                    className={cn(
                      'absolute inset-0 rounded-lg object-cover w-full h-full transition-opacity duration-200',
                      isLoaded ? 'opacity-100' : 'opacity-0'
                    )}
                    onLoad={() => handleImageLoad(index)}
                    onError={() => handleImageError(index)}
                  />
                  {!isLoaded && <PhotoSkeleton />}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default memo(PlacePhotos)
