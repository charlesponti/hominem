

import { AudioLines, FileText, Film, Image, Paperclip, X } from 'lucide-react';
import { forwardRef, useState, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

type MediaCategory = 'image' | 'video' | 'audio' | 'document' | 'source' | 'unknown';

interface FileUIPart {
  type: 'file';
  mimeType: string;
  name: string;
  url?: string;
  id?: string;
}

interface SourceDocumentUIPart {
  type: 'source-document';
  source: {
    url: string;
    title?: string;
  };
  id?: string;
}

type AttachmentData = (FileUIPart & { id: string }) | (SourceDocumentUIPart & { id: string });

export function getMediaCategory(data: AttachmentData): MediaCategory {
  if (data.type === 'source-document') {
    return 'source';
  }

  const mimeType = data.mimeType || '';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) {
    return 'document';
  }

  return 'unknown';
}

export function getAttachmentLabel(data: AttachmentData): string {
  if (data.type === 'source-document') {
    return data.source.title || 'Source Document';
  }
  return data.name || 'Attachment';
}

interface AttachmentsProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'grid' | 'inline' | 'list';
}

export const Attachments = forwardRef<HTMLDivElement, AttachmentsProps>(function Attachments(
  { variant = 'grid', className, children, ...props },
  ref,
) {
  const variantClasses = {
    grid: 'grid grid-cols-2 sm:grid-cols-3 gap-2',
    inline: 'flex flex-wrap gap-2',
    list: 'flex flex-col gap-2',
  };

  return (
    <div ref={ref} className={cn(variantClasses[variant], className)} {...props}>
      {children}
    </div>
  );
});

interface AttachmentProps extends HTMLAttributes<HTMLDivElement> {
  data: AttachmentData;
  onRemove?: () => void;
}

export const Attachment = forwardRef<HTMLDivElement, AttachmentProps>(function Attachment(
  { data, onRemove, className, children, ...props },
  ref,
) {
  const category = getMediaCategory(data);

  const categoryIcons: Record<MediaCategory, ReactNode> = {
    image: <Image className="size-8" />,
    video: <Film className="size-8" />,
    audio: <AudioLines className="size-8" />,
    document: <FileText className="size-8" />,
    source: <Paperclip className="size-8" />,
    unknown: <Paperclip className="size-8" />,
  };

  return (
    <div
      ref={ref}
      className={cn(
        'relative group flex flex-col items-center justify-center p-4 rounded-md border bg-muted/50 hover:bg-muted transition-colors',
        category === 'image' && 'aspect-square',
        className,
      )}
      {...props}
    >
      {onRemove && (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute top-1 right-1 size-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="size-3" />
        </Button>
      )}
      {children || (
        <>
          <div className="text-muted-foreground mb-2">{categoryIcons[category]}</div>
          <span className="text-xs text-center truncate max-w-full">
            {getAttachmentLabel(data)}
          </span>
        </>
      )}
    </div>
  );
});

interface AttachmentPreviewProps extends HTMLAttributes<HTMLDivElement> {
  fallbackIcon?: ReactNode;
}

export function AttachmentPreview({ fallbackIcon, className, ...props }: AttachmentPreviewProps) {
  return (
    <div className={cn('flex items-center justify-center', className)} {...props}>
      {fallbackIcon || <Image className="size-8" />}
    </div>
  );
}

interface AttachmentInfoProps extends HTMLAttributes<HTMLDivElement> {
  showMediaType?: boolean;
}

export function AttachmentInfo({ className, children, ...props }: AttachmentInfoProps) {
  return (
    <div className={cn('flex flex-col', className)} {...props}>
      {children}
    </div>
  );
}

interface AttachmentRemoveProps extends HTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export function AttachmentRemove({ label = 'Remove', className, ...props }: AttachmentRemoveProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('size-6', className)}
      aria-label={label}
      {...props}
    >
      <X className="size-3" />
    </Button>
  );
}

interface AttachmentHoverCardProps extends HTMLAttributes<HTMLDivElement> {
  openDelay?: number;
  closeDelay?: number;
}

export function AttachmentHoverCard({
  openDelay = 0,
  closeDelay = 0,
  className,
  children,
  ...props
}: AttachmentHoverCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={cn('relative inline-block', className)}
      onMouseEnter={() => setTimeout(() => setIsOpen(true), openDelay)}
      onMouseLeave={() => setTimeout(() => setIsOpen(false), closeDelay)}
      {...props}
    >
      {children}
      {isOpen && (
        <div className="absolute z-50 bottom-full mb-2 left-0 w-48 p-2 rounded-md border bg-background shadow-lg">
          Preview content
        </div>
      )}
    </div>
  );
}

export function AttachmentHoverCardTrigger({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('cursor-pointer', className)} {...props}>
      {children}
    </div>
  );
}

export function AttachmentHoverCardContent({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-2', className)} {...props}>
      {children}
    </div>
  );
}

interface AttachmentEmptyProps extends HTMLAttributes<HTMLDivElement> {}

export function AttachmentEmpty({ className, ...props }: AttachmentEmptyProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-4 text-muted-foreground',
        className,
      )}
      {...props}
    >
      <Paperclip className="size-8 mb-2" />
      <span className="text-sm">No attachments</span>
    </div>
  );
}
