import { Button } from '@ponti-studios/ui/primitives';
import { User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '~/lib/utils';

import { ImageCropDialog } from './ImageCropDialog';

interface ProfileImageUploadProps {
  currentImageUrl?: string | null | undefined;
  onUpload: (croppedImageBlob: Blob) => Promise<string | void>;
  compact?: boolean;
}

export function ProfileImageUpload({
  currentImageUrl,
  onUpload,
  compact = false,
}: ProfileImageUploadProps) {
  const [imgSrc, setImgSrc] = useState<string>(currentImageUrl || '');
  const [displayImageUrl, setDisplayImageUrl] = useState<string>(currentImageUrl || '');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayImageUrl(currentImageUrl || '');
  }, [currentImageUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
      e.currentTarget.value = '';
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be less than 5MB');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImgSrc(reader.result?.toString() || '');
      setShowCropper(true);
    });
    reader.readAsDataURL(file);
  };

  const handleUpload = async (croppedImageBlob: Blob) => {
    try {
      setIsUploading(true);
      const uploadedImageUrl = await onUpload(croppedImageBlob);
      if (typeof uploadedImageUrl === 'string' && uploadedImageUrl.trim() !== '') {
        setDisplayImageUrl(uploadedImageUrl);
      }
      setUploadError(null);
      setShowCropper(false);
      setImgSrc('');
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setShowCropper(false);
    setImgSrc('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (showCropper) {
    return (
      <ImageCropDialog
        imageSrc={imgSrc}
        isOpen={showCropper}
        isSubmitting={isUploading}
        title="Crop Profile Image"
        confirmLabel="Upload"
        imageAlt="Profile image"
        onCancel={handleCancel}
        onConfirm={handleUpload}
      />
    );
  }

  const avatarSizeClass = compact ? 'size-12' : 'size-16';
  const avatarBorderClass = compact ? 'border-2' : 'border-4';
  const avatarIconClass = compact ? 'w-5 h-5' : 'w-6 h-6';

  return (
    <div className="space-y-1">
      {/* Current Profile Image */}
      <div className={compact ? 'flex items-center' : 'mb-4 flex items-center'}>
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          variant="ghost"
          className="group p-0"
          aria-label="Upload profile image"
        >
          <div className="flex shrink-0 items-center justify-center">
            <div
              className={cn(
                'flex items-center justify-center overflow-hidden rounded-full border border-border bg-muted',
                avatarSizeClass,
                avatarBorderClass,
              )}
            >
              {displayImageUrl.trim() !== '' ? (
                <img src={displayImageUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <User className={cn('text-muted-foreground', avatarIconClass)} />
              )}
            </div>
          </div>
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {uploadError && (
        <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 p-3">
          <p className="body-3 text-destructive">{uploadError}</p>
        </div>
      )}
    </div>
  );
}
