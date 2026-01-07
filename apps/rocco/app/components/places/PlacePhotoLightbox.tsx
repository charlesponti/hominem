import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { env } from '~/lib/env'

type Props = {
  photos: string[]
  currentIndex: number
  isOpen: boolean
  onClose: () => void
  alt: string
}

const getGooglePlaceImgUrl = (photoUrl: string, width = 1200, height = 800) => {
  // If it's already a Supabase Storage URL or other hosted image, return as-is
  if (
    photoUrl.includes('supabase.co') ||
    (photoUrl.startsWith('http') &&
      !(
        photoUrl.includes('places/') &&
        photoUrl.includes('googleusercontent') &&
        photoUrl.includes('googleapis')
      ))
  ) {
    return photoUrl
  }

  // If it's already a full Google APIs URL, return as-is to avoid double-transformation
  if (photoUrl.includes('googleapis.com')) {
    return photoUrl
  }

  // Handle Google Places API photo references
  if (photoUrl.includes('places/') && photoUrl.includes('/photos/')) {
    return `https://places.googleapis.com/v1/${photoUrl}/media?key=${env.VITE_GOOGLE_API_KEY}&maxWidthPx=${width}&maxHeightPx=${height}`
  }

  // Handle Google user content URLs
  if (photoUrl.includes('googleusercontent')) {
    return `${photoUrl}=w${width}-h${height}-c`
  }

  return photoUrl
}

const PlacePhotoLightbox = ({ photos, currentIndex, isOpen, onClose, alt }: Props) => {
  const [activeIndex, setActiveIndex] = useState(currentIndex)
  const photo = photos[activeIndex]

  useEffect(() => {
    setActiveIndex(currentIndex)
  }, [currentIndex])

  const goToPrevious = useCallback(() => {
    setActiveIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1))
  }, [photos.length])

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1))
  }, [photos.length])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
      if (e.key === 'ArrowLeft') {
        goToPrevious()
      }
      if (e.key === 'ArrowRight') {
        goToNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, goToPrevious, goToNext])

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all hover:scale-110"
        aria-label="Close lightbox"
      >
        <X size={24} className="text-white" />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 z-10 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white font-medium">
        {activeIndex + 1} / {photos.length}
      </div>

      {/* Navigation buttons */}
      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              goToPrevious()
            }}
            className="absolute left-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all hover:scale-110"
            aria-label="Previous photo"
          >
            <ChevronLeft size={32} className="text-white" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              goToNext()
            }}
            className="absolute right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all hover:scale-110"
            aria-label="Next photo"
          >
            <ChevronRight size={32} className="text-white" />
          </button>
        </>
      )}

      {/* Main image */}
      {photo && (
        <img
          src={getGooglePlaceImgUrl(photo, 1600, 1200)}
          alt={`${alt} - ${activeIndex + 1}`}
          className="max-w-[90vw] max-h-[90vh] object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  )
}

export default PlacePhotoLightbox
