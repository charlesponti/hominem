import type { JobApplicationRecord as ApplicationWithCompany } from '@hominem/db';
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ponti-studios/ui/forms';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
} from '@ponti-studios/ui/primitives';
import { AlertCircle, CheckCircle, Copy, Download, FileText, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useFetcher } from 'react-router';

import type {
  CustomizeResumeApiRequest,
  CustomizeResumeApiResponse,
  JobAnalysis,
} from '~/lib/api-contracts';
import type { JobPosting } from '~/lib/services/job-scraping.service';
import { getCompanyName } from '~/lib/utils/applicationUtils';

interface ApplicationResumeTabProps {
  application: ApplicationWithCompany;
  applicationId: string;
}

function toFilenamePart(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'resume'
  );
}

function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function ApplicationResumeTab({
  application,
  applicationId: _applicationId,
}: ApplicationResumeTabProps) {
  const fetcher = useFetcher();

  const [resumeFormat, setResumeFormat] = useState<
    'professional' | 'modern' | 'technical' | 'executive'
  >('professional');
  const [targetLength, setTargetLength] = useState<'concise' | 'standard' | 'detailed'>('standard');
  const [focusAreas, setFocusAreas] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResume, setGeneratedResume] = useState<string | null>(null);
  const [jobAnalysis, setJobAnalysis] = useState<JobAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showRegenerate, setShowRegenerate] = useState(false);

  const parsedJobPosting = useMemo<JobPosting | null>(() => {
    if (!application.jobPosting) return null;
    try {
      return JSON.parse(application.jobPosting) as JobPosting;
    } catch {
      return null;
    }
  }, [application.jobPosting]);

  const hasStructuredPosting = parsedJobPosting !== null;
  const hasRawPosting = !hasStructuredPosting && Boolean(application.jobPosting);
  const hasAnyPosting = hasStructuredPosting || hasRawPosting;
  const resumeFilename = `${toFilenamePart(getCompanyName(application.company))}-${toFilenamePart(
    application.position,
  )}-resume.md`;

  const isSaving = fetcher.state !== 'idle';
  const saveSuccess =
    fetcher.data && (fetcher.data as { message?: string }).message === 'Resume saved successfully';

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const request: CustomizeResumeApiRequest = {
        resumeFormat,
        targetLength,
        focusAreas: focusAreas
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        ...(hasStructuredPosting
          ? { jobPostingData: parsedJobPosting! }
          : { jobPosting: application.jobPosting ?? undefined }),
      };
      const response = await fetch('/api/resume/customize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      const data = (await response.json()) as CustomizeResumeApiResponse;
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Generation failed');
      }
      setGeneratedResume(data.customizedResume);
      setJobAnalysis(data.jobAnalysis);
      setShowRegenerate(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  }

  function handleSave() {
    if (!generatedResume) return;
    const formData = new FormData();
    formData.set('operation', 'save_resume');
    formData.set('resume', generatedResume);
    fetcher.submit(formData, { method: 'POST' });
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }

  function handleDownload(text: string) {
    downloadMarkdown(resumeFilename, text);
  }

  if (!hasAnyPosting) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <FileText className="size-10 text-muted-foreground/50" />
        <p className="body-3 text-muted-foreground">
          No job description stored for this application.
        </p>
        <p className="body-3 text-muted-foreground">
          Add a job posting URL or description in the Overview tab to generate a tailored resume.
        </p>
      </div>
    );
  }

  const showGenerateForm = !application.resume || showRegenerate || generatedResume;

  return (
    <div className="space-y-4">
      {/* Job posting summary */}
      {hasStructuredPosting && parsedJobPosting && (
        <Card>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              <span className="subheading-4 text-foreground">
                {parsedJobPosting.job_title || application.position}
              </span>
              {parsedJobPosting.companyName && (
                <span className="body-3 text-muted-foreground">
                  at {parsedJobPosting.companyName}
                </span>
              )}
              {parsedJobPosting.skills?.slice(0, 6).map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-0.5 bg-accent/20 text-muted-foreground caption1 rounded-md"
                >
                  {skill}
                </span>
              ))}
              {(parsedJobPosting.skills?.length ?? 0) > 6 && (
                <span className="body-4 text-muted-foreground">
                  +{(parsedJobPosting.skills?.length ?? 0) - 6} more
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved resume preview */}
      {application.resume && !showRegenerate && !generatedResume && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Saved Resume</CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleCopy(application.resume!)}>
                  <Copy className="size-4 mr-1" />
                  Copy
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(application.resume!)}
                >
                  <Download className="size-4 mr-1" />
                  Download
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowRegenerate(true)}>
                  <Sparkles className="size-4 mr-1" />
                  Regenerate
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="body-4 text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
              {application.resume.slice(0, 800)}
              {application.resume.length > 800 ? '\n\n…' : ''}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Generate form */}
      {showGenerateForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              <Sparkles className="size-4" />
              {application.resume ? 'Regenerate Resume' : 'Generate Tailored Resume'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="resume-format" className="subheading-4 text-muted-foreground">
                  Format
                </Label>
                <Select
                  value={resumeFormat}
                  onValueChange={(v) => setResumeFormat(v as typeof resumeFormat)}
                >
                  <SelectTrigger id="resume-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="modern">Modern</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="resume-length" className="subheading-4 text-muted-foreground">
                  Length
                </Label>
                <Select
                  value={targetLength}
                  onValueChange={(v) => setTargetLength(v as typeof targetLength)}
                >
                  <SelectTrigger id="resume-length">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concise">Concise</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="resume-focus-areas" className="subheading-4 text-muted-foreground">
                Focus Areas{' '}
                <span className="font-normal text-muted-foreground/70">
                  (optional, comma-separated)
                </span>
              </Label>
              <Input
                id="resume-focus-areas"
                placeholder="e.g. leadership, TypeScript, distributed systems"
                value={focusAreas}
                onChange={(e) => setFocusAreas(e.target.value)}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 body-3 text-destructive">
                <AlertCircle className="size-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                isLoading={isGenerating}
                loadingLabel="Generating..."
                className="flex-1"
              >
                <Sparkles className="size-4 mr-2" />
                Generate Resume
              </Button>
              {showRegenerate && (
                <Button variant="outline" onClick={() => setShowRegenerate(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated resume result */}
      {generatedResume && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle>Generated Resume</CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleCopy(generatedResume)}>
                  <Copy className="size-4 mr-1" />
                  {copySuccess ? 'Copied!' : 'Copy'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDownload(generatedResume)}>
                  <Download className="size-4 mr-1" />
                  Download
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  isLoading={isSaving}
                  loadingLabel="Saving..."
                >
                  {saveSuccess ? (
                    <>
                      <CheckCircle className="size-4 mr-1" />
                      Saved
                    </>
                  ) : (
                    'Save to Application'
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {jobAnalysis && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg body-3">
                {jobAnalysis.requiredSkills.length > 0 && (
                  <div>
                    <p className="subheading-4 text-foreground mb-1">Matched Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {jobAnalysis.requiredSkills.map((skill) => (
                        <span
                          key={skill}
                          className="px-1.5 py-0.5 bg-success/10 text-success caption1 rounded"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {jobAnalysis.recommendedKeywords.length > 0 && (
                  <div>
                    <p className="subheading-4 text-foreground mb-1">ATS Keywords</p>
                    <div className="flex flex-wrap gap-1">
                      {jobAnalysis.recommendedKeywords.slice(0, 6).map((kw) => (
                        <span
                          key={kw}
                          className="px-1.5 py-0.5 bg-accent/20 text-muted-foreground caption1 rounded"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <pre className="caption1 font-mono whitespace-pre-wrap leading-relaxed max-h-[32rem] overflow-y-auto border border-border rounded-lg p-4">
              {generatedResume}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
