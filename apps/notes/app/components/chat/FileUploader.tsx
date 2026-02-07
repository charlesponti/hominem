import { Button } from '@hominem/ui/button';
import {
  AlertCircle,
  CheckCircle,
  FileText,
  Image,
  Music,
  Paperclip,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { useCallback, useState } from 'react';

import type { UploadedFile } from '~/lib/types/upload.js';

import { useFileUpload } from '~/lib/hooks/use-file-upload.js';

interface FileUploaderProps {
  onFilesUploaded?: (files: UploadedFile[]) => void;
  maxFiles?: number;
  className?: string;
}

export function FileUploader({ onFilesUploaded, maxFiles = 5, className = '' }: FileUploaderProps) {
  const { uploadState, uploadFiles, removeFile, clearAll } = useFileUpload();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = useCallback(
    async (files: FileList | File[]) => {
      try {
        const fileArray = Array.from(files);
        if (fileArray.length > maxFiles) {
          console.warn(`Only ${maxFiles} files allowed. Selected: ${fileArray.length}`);
          return;
        }
        const newFiles = await uploadFiles(files);
        onFilesUploaded?.(newFiles);
      } catch (error) {
        console.error('Upload failed:', error);
      }
    },
    [uploadFiles, onFilesUploaded, maxFiles],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files);
      }
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="size-4" />;
      case 'audio':
        return <Music className="size-4" />;
      case 'video':
        return <Video className="size-4" />;
      case 'document':
        return <FileText className="size-4" />;
      default:
        return <Paperclip className="size-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* File Upload Area */}
      <button
        type="button"
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors w-full
          ${isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${uploadState.isUploading ? 'pointer-events-none opacity-50' : 'hover:border-primary/50'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="mx-auto size-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-2">
          {uploadState.isUploading ? 'Uploading files...' : 'Drop files here or click to upload'}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploadState.isUploading}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.txt';
            input.onchange = (e) => {
              const files = (e.target as HTMLInputElement).files;
              if (files) handleFileSelect(files);
            };
            input.click();
          }}
        >
          <Paperclip className="size-4 mr-2" />
          Choose Files
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Supports images, documents, audio, and video files (max 10MB each)
        </p>
      </button>

      {/* Upload Progress */}
      {uploadState.isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Uploading...</span>
            <span>{uploadState.progress}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadState.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Messages */}
      {uploadState.errors.length > 0 && (
        <div className="space-y-2">
          {uploadState.errors.map((error) => (
            <div key={error} className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadState.uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Uploaded Files ({uploadState.uploadedFiles.length})
            </h4>
            <Button type="button" variant="ghost" size="sm" onClick={clearAll} className="text-xs">
              Clear All
            </Button>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto">
            {uploadState.uploadedFiles.map((file) => (
              <div key={file.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {/* File Icon */}
                <div className="shrink-0">{getFileIcon(file.type)}</div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.originalName}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span className="capitalize">{file.type}</span>
                    {file.textContent && (
                      <>
                        <span>•</span>
                        <CheckCircle className="size-3 text-foreground" />
                        <span>Processed</span>
                      </>
                    )}
                  </div>

                  {/* File Preview/Content */}
                  {file.content && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {file.content}
                    </p>
                  )}
                </div>

                {/* Thumbnail */}
                {file.thumbnail && (
                  <div className="shrink-0">
                    <img
                      src={file.thumbnail}
                      alt="Thumbnail"
                      className="w-12 h-12 object-cover rounded"
                    />
                  </div>
                )}

                {/* Remove Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(file.id)}
                  className="shrink-0 size-8"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
