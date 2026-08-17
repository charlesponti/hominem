import { Collapsible } from '@base-ui/react/collapsible';
import type {
  ResumeAnalysisStage,
  ResumeImportDiff,
  ResumeListItemChange,
  ResumeScalarFieldChange,
} from '@hominem/queues';
import { DropZone, type DropZoneProps } from '@ponti-studios/ui/forms';
import { Button, buttonVariants } from '@ponti-studios/ui/primitives';
import { ChevronDown, FileTextIcon, Loader2Icon, RefreshCwIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRevalidator, useSearchParams } from 'react-router';

import type { AccountDocumentFile } from '~/lib/account/types';
import { RESUME_STAGE_INFO } from '~/lib/resume-import/stages';
import type { SseResumeEvent } from '~/lib/resume-import/types';
import { cn } from '~/lib/utils';

type DropZoneStatus = DropZoneProps['status'];

const GROUP_LABELS: Record<ResumeListItemChange['group'], string> = {
  workExperience: 'Work experience',
  skills: 'Skills',
  projects: 'Projects',
};

const SCALAR_GROUP_LABELS: Record<ResumeScalarFieldChange['group'], string> = {
  basics: 'Basic info',
  social: 'Social links',
};

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function scalarKey(change: ResumeScalarFieldChange) {
  return `${change.group}.${change.field}`;
}

function groupListChanges(changes: ResumeListItemChange[]) {
  const groups = new Map<ResumeListItemChange['group'], ResumeListItemChange[]>();
  for (const change of changes) {
    const existing = groups.get(change.group) ?? [];
    existing.push(change);
    groups.set(change.group, existing);
  }
  return groups;
}

function groupScalarChanges(changes: ResumeScalarFieldChange[]) {
  const groups = new Map<ResumeScalarFieldChange['group'], ResumeScalarFieldChange[]>();
  for (const change of changes) {
    const existing = groups.get(change.group) ?? [];
    existing.push(change);
    groups.set(change.group, existing);
  }
  return groups;
}

type Phase = 'idle' | 'uploading' | 'analyzing' | 'reviewing' | 'applying' | 'error';

export function ResumeImportSection({
  documents,
  onDelete,
}: {
  documents: AccountDocumentFile[];
  onDelete: (fileId: string) => Promise<void>;
}) {
  const revalidator = useRevalidator();
  const [searchParams, setSearchParams] = useSearchParams();
  const resumeJobId = searchParams.get('resumeJobId');

  const [open, setOpen] = useState(Boolean(resumeJobId));
  const [phase, setPhase] = useState<Phase>(resumeJobId ? 'analyzing' : 'idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dropzoneStatus, setDropzoneStatus] = useState<DropZoneStatus>('empty');
  const [dropzoneError, setDropzoneError] = useState<string | null>(null);
  const [busyDocId, setBusyDocId] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);

  const [jobId, setJobId] = useState<string | null>(resumeJobId);
  const [stageEvent, setStageEvent] = useState<SseResumeEvent | null>(null);
  const [diff, setDiff] = useState<ResumeImportDiff | null>(null);
  const [selectedScalarKeys, setSelectedScalarKeys] = useState<Set<string>>(new Set());
  const [selectedListKeys, setSelectedListKeys] = useState<Set<string>>(new Set());
  const [applyError, setApplyError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  const closeStream = () => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  };

  const watchJob = (id: string) => {
    closeStream();
    const es = new EventSource(`/api/resume/jobs/${id}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      const parsed = JSON.parse(event.data) as SseResumeEvent;
      setStageEvent(parsed);

      if (parsed.error) {
        setPhase('error');
        closeStream();
        return;
      }

      if (parsed.stage === 'done' && parsed.diff) {
        setDiff(parsed.diff);
        setSelectedScalarKeys(new Set(parsed.diff.scalarChanges.map(scalarKey)));
        setSelectedListKeys(new Set(parsed.diff.listChanges.map((item) => item.key)));
        setPhase('reviewing');
        closeStream();
      }
    };

    es.onerror = () => {
      // The browser retries automatically; the server's first event on
      // reconnect always re-emits the current snapshot, so no extra state.
    };
  };

  useEffect(() => {
    if (resumeJobId) {
      setJobId(resumeJobId);
      setPhase('analyzing');
      watchJob(resumeJobId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => closeStream(), []);

  const startAnalysis = async (body: FormData) => {
    setDropzoneStatus('busy');
    setDropzoneError(null);
    setPhase('uploading');

    try {
      const response = await fetch('/api/resume/analyze', { method: 'POST', body });
      const result = (await response.json()) as {
        jobId?: string;
        fileUrl?: string;
        error?: string;
      };

      if (!response.ok || !result.jobId) {
        setDropzoneStatus('failed');
        setDropzoneError(result.error ?? 'Could not start resume analysis.');
        setPhase('idle');
        return;
      }

      setSelectedFile(null);
      setDropzoneStatus('empty');
      setJobId(result.jobId);
      setSearchParams((params) => {
        params.set('resumeJobId', result.jobId!);
        return params;
      });
      setPhase('analyzing');
      watchJob(result.jobId);
    } catch {
      setDropzoneStatus('failed');
      setDropzoneError('Could not start resume analysis. Try again.');
      setPhase('idle');
    }
  };

  const handleUploadSubmit = () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('pdf', selectedFile);
    void startAnalysis(formData);
  };

  const handleConvertDocument = (fileId: string) => {
    setOpen(true);
    const formData = new FormData();
    formData.append('fileId', fileId);
    void startAnalysis(formData);
  };

  const handleDeleteDocument = async (doc: AccountDocumentFile) => {
    if (!confirm(`Delete "${doc.displayName}"? This cannot be undone.`)) return;
    setDocError(null);
    setBusyDocId(doc.id);
    try {
      await onDelete(doc.id);
    } catch (error) {
      setDocError(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setBusyDocId(null);
    }
  };

  const resetToIdle = () => {
    closeStream();
    setPhase('idle');
    setJobId(null);
    setStageEvent(null);
    setDiff(null);
    setApplyError(null);
    setOpen(false);
    setSearchParams((params) => {
      params.delete('resumeJobId');
      return params;
    });
  };

  const handleApply = async () => {
    if (!jobId) return;
    setPhase('applying');
    setApplyError(null);

    const formData = new FormData();
    formData.append('action', 'apply-resume-import');
    formData.append('jobId', jobId);
    for (const key of selectedScalarKeys) formData.append('scalarField', key);
    for (const key of selectedListKeys) formData.append('listKey', key);

    try {
      const response = await fetch('/profile', { method: 'POST', body: formData });
      const contentType = response.headers.get('content-type');
      const result = contentType?.includes('application/json')
        ? ((await response.json()) as { success: boolean; error?: string })
        : { success: response.ok, error: response.ok ? undefined : await response.text() };

      if (!result.success) {
        setApplyError(result.error ?? "We couldn't apply those changes. Try again.");
        setPhase('reviewing');
        return;
      }

      resetToIdle();
      revalidator.revalidate();
    } catch {
      setApplyError("We couldn't apply those changes. Try again.");
      setPhase('reviewing');
    }
  };

  const stage: ResumeAnalysisStage = stageEvent?.stage ?? 'queued';
  const stageInfo = RESUME_STAGE_INFO[stage];
  const groupedListChanges = useMemo(
    () =>
      diff
        ? groupListChanges(diff.listChanges)
        : new Map<ResumeListItemChange['group'], ResumeListItemChange[]>(),
    [diff],
  );
  const groupedScalarChanges = useMemo(
    () =>
      diff
        ? groupScalarChanges(diff.scalarChanges)
        : new Map<ResumeScalarFieldChange['group'], ResumeScalarFieldChange[]>(),
    [diff],
  );

  const toggleScalar = (key: string, checked: boolean) => {
    setSelectedScalarKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const toggleListKey = (key: string, checked: boolean) => {
    setSelectedListKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const selectionCount = selectedScalarKeys.size + selectedListKeys.size;

  return (
    <section className="space-y-4 border border-border rounded-2xl p-4">
      <div className="space-y-1">
        <h2 className="heading-4">Resume</h2>
        <p className="body-3 text-muted-foreground">
          Upload a resume PDF to fill out or update your profile with AI-parsed details.
        </p>
      </div>

      {phase === 'idle' ? (
        <Collapsible.Root open={open} onOpenChange={setOpen}>
          <Collapsible.Trigger
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
          >
            <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
            Upload new resume
          </Collapsible.Trigger>
          <Collapsible.Panel className="animate-accordion-down overflow-hidden">
            <div className="pt-4">
              <DropZone
                status={dropzoneStatus}
                file={selectedFile ? { name: selectedFile.name, size: selectedFile.size } : null}
                error={dropzoneError}
                accept=".pdf,application/pdf"
                emptyLabel={
                  <>
                    Drop a resume here, or <span className="text-primary font-medium">browse</span>
                  </>
                }
                emptyHint="PDF only · max 10MB"
                busyLabel="Starting analysis"
                submitLabel="Analyze resume"
                retryLabel="Try again"
                cancelLabel="Cancel"
                onFiles={(files) => {
                  const file = files[0];
                  if (!file) return;
                  setSelectedFile(file);
                  setDropzoneStatus('armed');
                  setDropzoneError(null);
                }}
                onSubmit={handleUploadSubmit}
                onRetry={handleUploadSubmit}
                onCancel={() => {
                  setSelectedFile(null);
                  setDropzoneStatus('empty');
                  setDropzoneError(null);
                }}
              />
            </div>
          </Collapsible.Panel>
        </Collapsible.Root>
      ) : null}

      {phase === 'uploading' || phase === 'analyzing' ? (
        <div className="space-y-2 rounded-2xl bg-muted/40 p-4">
          <div className="flex items-center gap-2">
            <Loader2Icon className="size-4 animate-spin text-primary" />
            <p className="body-3 text-foreground">{stageInfo.label}</p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${stageInfo.percent}%` }}
            />
          </div>
        </div>
      ) : null}

      {phase === 'error' ? (
        <div className="rounded-2xl bg-destructive/10 p-4 space-y-2">
          <p className="subheading-4 text-destructive">Resume analysis failed</p>
          <p className="body-3 text-destructive">
            {stageEvent?.errorMessage ?? 'Something went wrong. Try again.'}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={resetToIdle}>
            Try again
          </Button>
        </div>
      ) : null}

      {(phase === 'reviewing' || phase === 'applying') && diff ? (
        <div className="space-y-4 rounded-2xl border border-border p-4">
          <div className="space-y-1">
            <h3 className="subheading-3">Review changes</h3>
            <p className="body-3 text-muted-foreground">
              Choose which updates from your resume to apply. Nothing changes until you apply.
            </p>
          </div>

          {applyError ? (
            <p className="body-3 text-destructive" role="alert">
              {applyError}
            </p>
          ) : null}

          {diff.scalarChanges.length === 0 && diff.listChanges.length === 0 ? (
            <p className="body-3 text-muted-foreground">
              Nothing new was found — your profile already matches this resume.
            </p>
          ) : null}

          {Array.from(groupedScalarChanges.entries()).map(([group, changes]) => (
            <div key={group} className="space-y-2">
              <p className="subheading-4 text-foreground">{SCALAR_GROUP_LABELS[group]}</p>
              <ul className="space-y-2">
                {changes.map((change) => {
                  const key = scalarKey(change);
                  return (
                    <li key={key} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id={`scalar-${key}`}
                        className="mt-1 size-4 accent-primary"
                        checked={selectedScalarKeys.has(key)}
                        disabled={phase === 'applying'}
                        onChange={(event) => toggleScalar(key, event.target.checked)}
                      />
                      <label htmlFor={`scalar-${key}`} className="body-3 flex-1">
                        <span className="font-medium text-foreground">{change.label}: </span>
                        <span className="text-muted-foreground line-through">
                          {String(change.current ?? '—')}
                        </span>{' '}
                        <span className="text-foreground">→ {String(change.proposed ?? '—')}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {Array.from(groupedListChanges.entries()).map(([group, items]) => (
            <div key={group} className="space-y-2">
              <p className="subheading-4 text-foreground">{GROUP_LABELS[group]}</p>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.key} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id={`list-${item.key}`}
                      className="mt-1 size-4 accent-primary"
                      checked={selectedListKeys.has(item.key)}
                      disabled={phase === 'applying'}
                      onChange={(event) => toggleListKey(item.key, event.target.checked)}
                    />
                    <label htmlFor={`list-${item.key}`} className="body-3 flex-1 text-foreground">
                      {item.summary}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              size="sm"
              disabled={selectionCount === 0 || phase === 'applying'}
              isLoading={phase === 'applying'}
              loadingLabel="Applying..."
              onClick={handleApply}
            >
              Apply selected updates
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={resetToIdle}
              disabled={phase === 'applying'}
            >
              Discard
            </Button>
          </div>
        </div>
      ) : null}

      {documents.length > 0 ? (
        <div className="space-y-2">
          <p className="subheading-4 text-foreground">Uploaded resumes</p>
          {docError ? (
            <p className="body-3 text-destructive" role="alert">
              {docError}
            </p>
          ) : null}
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
            {documents.map((doc) => {
              const isBusy = busyDocId === doc.id;
              return (
                <li
                  key={doc.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <FileTextIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 space-y-0.5">
                      <p className="subheading-4 truncate text-foreground">{doc.displayName}</p>
                      <p className="text-sm text-muted-foreground">{formatBytes(doc.size)}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isBusy || phase !== 'idle'}
                      onClick={() => handleConvertDocument(doc.id)}
                    >
                      <RefreshCwIcon className="size-4" />
                      Convert
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={isBusy}
                      isLoading={isBusy}
                      loadingLabel="Deleting…"
                      onClick={() => handleDeleteDocument(doc)}
                    >
                      <Trash2Icon className="size-4" />
                      Delete
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
