import { DropZone, type DropZoneProps } from '@ponti-studios/ui/forms';
import { Button } from '@ponti-studios/ui/primitives';
import { LogIn } from 'lucide-react';
import { useRef, useState } from 'react';

import type { UploadResumeApiResponse } from '~/lib/api-contracts';

import type { ResumeConvertStage } from '../types/resume';

type DropZoneStatus = DropZoneProps['status'];

interface UploadResumeFormProps {
  onUploadStart: () => void;
  onUploadComplete: (response: UploadResumeApiResponse) => void;
  onUploadError?: (error: string) => void;
  mode?: 'create' | 'replace';
}

function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

async function readUploadResponse(response: Response): Promise<UploadResumeApiResponse> {
  try {
    return (await response.json()) as UploadResumeApiResponse;
  } catch {
    return {
      error: response.ok
        ? 'Upload succeeded but the response was unreadable. Refresh your profile page to check your profile.'
        : 'Server returned an unreadable error response. Try again.',
      stage: 'request',
      retryable: true,
    };
  }
}

export function UploadResumeForm({
  onUploadStart,
  onUploadComplete,
  onUploadError,
  mode = 'create',
}: UploadResumeFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<DropZoneStatus>('empty');
  const [error, setError] = useState<string | null>(null);
  const [errorStage, setErrorStage] = useState<ResumeConvertStage | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleFiles = (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setNotice(files.length > 1 ? 'Only the first PDF was selected.' : null);
    setError(null);
    setErrorStage(null);
    setRequiresLogin(false);

    if (!isPdfFile(file)) {
      setSelectedFile(null);
      setStatus('failed');
      setError('Please select a PDF file');
      onUploadError?.('Please select a PDF file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setSelectedFile(null);
      setStatus('failed');
      setError('File size must be less than 10MB');
      onUploadError?.('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setStatus('armed');
  };

  const cancelUpload = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStatus(selectedFile ? 'armed' : 'empty');
    setNotice('Upload canceled.');
    setError(null);
    setErrorStage(null);
    setRequiresLogin(false);
  };

  const uploadResume = async () => {
    setError(null);
    setErrorStage(null);
    setNotice(null);
    setRequiresLogin(false);

    if (!selectedFile) {
      setStatus('failed');
      setError('Please select a PDF file');
      onUploadError?.('Please select a PDF file');
      return;
    }
    if (!isPdfFile(selectedFile)) {
      setStatus('failed');
      setError('Please select a PDF file');
      onUploadError?.('Please select a PDF file');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setStatus('failed');
      setError('File size must be less than 10MB');
      onUploadError?.('File size must be less than 10MB');
      return;
    }

    setStatus('busy');
    onUploadStart();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const formData = new FormData();
      formData.append('pdf', selectedFile);
      if (mode === 'replace') formData.append('replaceExisting', 'true');
      const res = await fetch('/api/resume/convert', {
        method: 'POST',
        credentials: 'same-origin',
        body: formData,
        signal: abortController.signal,
      });
      const result = await readUploadResponse(res);
      abortControllerRef.current = null;

      if (!res.ok) {
        const msg = result.error ?? 'Conversion failed';
        setStatus('failed');
        setError(msg);
        setErrorStage(result.stage ?? null);
        setRequiresLogin(res.status === 401 || res.status === 403 || result.stage === 'auth');
        onUploadError?.(msg);
        return;
      }

      if (!result.data) {
        const msg =
          result.error ?? 'Upload completed, but the response did not include resume data.';
        setStatus('failed');
        setError(msg);
        setErrorStage(result.stage ?? 'request');
        onUploadError?.(msg);
        return;
      }

      onUploadComplete(result);
    } catch (uploadError) {
      abortControllerRef.current = null;
      if (uploadError instanceof DOMException && uploadError.name === 'AbortError') return;

      setStatus('failed');
      const msg = 'Upload failed';
      setError(msg);
      setErrorStage('request');
      onUploadError?.(msg);
    }
  };

  return (
    <div className="w-full max-w-md space-y-4 border rounded-2xl p-2 flex flex-col items-center">
      <h2 className="heading-4 self-start">
        {mode === 'replace' ? 'Replace your profile' : 'Upload your resume'}
      </h2>
      <DropZone
        status={status}
        file={selectedFile ? { name: selectedFile.name, size: selectedFile.size } : null}
        error={error}
        notice={notice}
        accept=".pdf,application/pdf"
        emptyLabel={
          <>
            Drop a resume here, or <span className="text-primary font-medium">browse</span>
          </>
        }
        emptyHint="PDF only · max 10MB"
        busyLabel="Resume processing"
        busyDescription="We're extracting your resume details and building your profile."
        submitLabel={mode === 'replace' ? 'Replace Profile' : 'Upload Resume'}
        retryLabel="Try again"
        cancelLabel="Cancel"
        onFiles={handleFiles}
        onSubmit={() => void uploadResume()}
        onRetry={() => void uploadResume()}
        onCancel={cancelUpload}
        failedActions={
          <>
            {errorStage ? (
              <p className="body-4 text-muted-foreground">
                Failed during {errorStage.replaceAll('-', ' ')}.
              </p>
            ) : null}
            {requiresLogin ? (
              <Button type="button" variant="outline" size="sm" asChild>
                <a href="/auth?next=/onboarding">
                  <LogIn className="size-4" />
                  Sign in
                </a>
              </Button>
            ) : null}
          </>
        }
      />
    </div>
  );
}
