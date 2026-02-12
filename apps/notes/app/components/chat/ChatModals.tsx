import { Button } from '@hominem/ui/button';
import { X } from 'lucide-react';

import type { UploadedFile } from '~/lib/types/upload.js';

import { AudioRecorder } from './AudioRecorder.js';
import { FileUploader } from './FileUploader.js';

interface ChatModalsProps {
  showFileUploader: boolean;
  showAudioRecorder: boolean;
  onCloseFileUploader: () => void;
  onCloseAudioRecorder: () => void;
  onFilesUploaded: (files: UploadedFile[]) => void;
  onAudioRecorded: (audioBlob: Blob, transcript?: string) => void;
}

export function ChatModals({
  showFileUploader,
  showAudioRecorder,
  onCloseFileUploader,
  onCloseAudioRecorder,
  onFilesUploaded,
  onAudioRecorded,
}: ChatModalsProps) {
  return (
    <>
      {/* File Upload Modal */}
      {showFileUploader && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="border p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Upload Files</h3>
              <Button variant="ghost" size="sm" onClick={onCloseFileUploader}>
                <X className="size-4" />
              </Button>
            </div>
            <FileUploader onFilesUploaded={onFilesUploaded} maxFiles={5} />
          </div>
        </div>
      )}

      {/* Audio Recorder Modal */}
      {showAudioRecorder && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="border p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Record Audio</h3>
              <Button variant="ghost" size="sm" onClick={onCloseAudioRecorder}>
                <X className="size-4" />
              </Button>
            </div>
            <AudioRecorder onRecordingComplete={onAudioRecorded} />
          </div>
        </div>
      )}
    </>
  );
}
