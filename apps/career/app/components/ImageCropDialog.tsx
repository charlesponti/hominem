import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@ponti-studios/ui/overlays';
import { Button } from '@ponti-studios/ui/primitives';
import { Upload } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import 'react-image-crop/dist/ReactCrop.css';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';

interface ImageCropDialogProps {
  imageSrc: string;
  isOpen: boolean;
  isSubmitting: boolean;
  title?: string;
  confirmLabel?: string;
  imageAlt?: string;
  onCancel: () => void;
  onConfirm: (croppedImageBlob: Blob) => Promise<void>;
}

const ASPECT_RATIO = 1;
const MIN_DIMENSION = 150;

export function ImageCropDialog({
  imageSrc,
  isOpen,
  isSubmitting,
  title = 'Crop Image',
  confirmLabel = 'Continue',
  imageAlt = 'Selected image',
  onCancel,
  onConfirm,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState<Crop>();
  const imgRef = useRef<HTMLImageElement>(null);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, ASPECT_RATIO));
  }

  const generateCroppedImage = useCallback(async () => {
    const image = imgRef.current;
    const currentCrop = crop;

    if (!image || !currentCrop || !currentCrop.width || !currentCrop.height) {
      throw new Error('Image or crop data is missing');
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const cropX = currentCrop.x * scaleX;
    const cropY = currentCrop.y * scaleY;
    const cropWidth = currentCrop.width * scaleX;
    const cropHeight = currentCrop.height * scaleY;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Unable to get canvas context');
    }

    canvas.width = cropWidth;
    canvas.height = cropHeight;
    ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
            return;
          }

          reject(new Error('Failed to create blob from canvas'));
        },
        'image/jpeg',
        0.8,
      );
    });
  }, [crop]);

  const handleConfirm = async () => {
    const croppedImageBlob = await generateCroppedImage();
    await onConfirm(croppedImageBlob);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="mb-6 flex flex-1 items-center justify-center overflow-auto">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={setCrop}
            aspect={ASPECT_RATIO}
            minWidth={MIN_DIMENSION}
            minHeight={MIN_DIMENSION}
            circularCrop
          >
            <img
              ref={imgRef}
              alt={imageAlt}
              src={imageSrc}
              style={{
                transform: 'scale(1) rotate(0deg)',
                maxHeight: '60vh',
                maxWidth: '100%',
                height: 'auto',
                width: 'auto',
              }}
              onLoad={onImageLoad}
              className="block"
            />
          </ReactCrop>
        </div>

        <div className="flex shrink-0 justify-end gap-3">
          <Button type="button" onClick={onCancel} disabled={isSubmitting} variant="outline">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || !crop}
            className="flex items-center gap-2"
            isLoading={isSubmitting}
            loadingLabel="Uploading..."
          >
            <Upload className="size-4" />
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}
