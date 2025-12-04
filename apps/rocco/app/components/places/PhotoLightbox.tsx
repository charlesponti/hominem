import { useEffect, useState } from 'react'

type Props = {
  photos: string[]
  currentIndex: number
  isOpen: boolean
  onClose: () => void
  alt: string
}

export default function PhotoLightbox({ photos, currentIndex, isOpen, onClose, alt }: Props) {
  const [index, setIndex] = useState<number>(currentIndex)

  useEffect(() => {
    if (!isOpen) return
    setIndex(currentIndex)
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % photos.length)
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + photos.length) % photos.length)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose, currentIndex, photos.length])

  // Swipe gesture support
  useEffect(() => {
    if (!isOpen) return
    let startX = 0
    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
    }
    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX
      if (endX - startX > 50) setIndex((i) => (i - 1 + photos.length) % photos.length)
      if (startX - endX > 50) setIndex((i) => (i + 1) % photos.length)
    }
    window.addEventListener('touchstart', handleTouchStart)
    window.addEventListener('touchend', handleTouchEnd)
    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isOpen, photos.length])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full aspect-[16/9] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={photos[index]}
          alt={`${alt} - ${index + 1}`}
          className="object-contain w-full h-full rounded-xl shadow-lg bg-black"
          loading="eager"
        />
        <button
          type="button"
          className="absolute top-2 right-2 text-white bg-black/60 rounded-full p-2"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        {/* Prev button */}
        {photos.length > 1 && (
          <button
            type="button"
            className="absolute left-2 top-1/2 -translate-y-1/2 text-white bg-black/60 rounded-full p-2"
            onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
            aria-label="Previous photo"
          >
            ‹
          </button>
        )}
        {/* Next button */}
        {photos.length > 1 && (
          <button
            type="button"
            className="absolute right-10 top-1/2 -translate-y-1/2 text-white bg-black/60 rounded-full p-2"
            onClick={() => setIndex((i) => (i + 1) % photos.length)}
            aria-label="Next photo"
          >
            ›
          </button>
        )}
      </div>
    </div>
  )
}
