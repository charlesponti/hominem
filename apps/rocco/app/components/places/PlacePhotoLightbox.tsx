import { Button } from '@hominem/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type Props = {
  photos: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  alt: string;
};

const PlacePhotoLightbox = ({ photos, currentIndex, isOpen, onClose, alt }: Props) => {
  const [activeIndex, setActiveIndex] = useState(currentIndex);
  const photo = photos[activeIndex];

  useEffect(() => {
    setActiveIndex(currentIndex);
  }, [currentIndex]);

  const goToPrevious = useCallback(() => {
    setActiveIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  }, [photos.length]);

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  }, [photos.length]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      }
      if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, goToPrevious, goToNext]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <Button
        variant="outline"
        size="icon"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 border-border/50 bg-transparent text-white hover:bg-white/10 hover:text-white"
        aria-label="Close lightbox"
      >
        <X size={24} className="text-white" />
      </Button>

      {/* Counter */}
      <div className="absolute top-4 left-4 z-10 px-4 py-2 text-white font-medium">
        {activeIndex + 1} / {photos.length}
      </div>

      {/* Navigation buttons */}
      {photos.length > 1 && (
        <>
          <Button
            variant="outline"
            size="icon-lg"
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
            className="absolute left-4 z-10 border-border/50 bg-transparent text-white hover:bg-white/10 hover:text-white"
            aria-label="Previous photo"
          >
            <ChevronLeft size={32} className="text-white" />
          </Button>

          <Button
            variant="outline"
            size="icon-lg"
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-4 z-10 border-border/50 bg-transparent text-white hover:bg-white/10 hover:text-white"
            aria-label="Next photo"
          >
            <ChevronRight size={32} className="text-white" />
          </Button>
        </>
      )}

      {/* Main image */}
      {photo && (
        <img
          src={photo}
          alt={`${alt} - ${activeIndex + 1}`}
          className="max-w-[90vw] max-h-[90vh] object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
};

export default PlacePhotoLightbox;
