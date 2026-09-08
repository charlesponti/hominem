import { CareerImportRepository } from '@hominem/db/career';
import { db } from '@hominem/db/core';
import type { CareerImportDraft } from '@hominem/queues';
import { isObject } from '@hominem/utils';
import { humanizeIdentifier } from '@hominem/utils/text';
import {
  DatePicker,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  todayDateInput,
} from '@ponti-studios/ui/forms';
import { Button, Card, CardContent } from '@ponti-studios/ui/primitives';
import { useEffect, useState } from 'react';
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Form, Link, redirect } from 'react-router';

import { useApiBaseUrl } from '~/hooks/useAuth';
import { logger } from '~/lib/logger';
import { userContext } from '~/lib/middleware';
import { JobApplicationsService } from '~/lib/services/job-applications.service';
import { isJobApplicationStatus, JobApplicationStatus } from '~/types/career';

type JobPosting = {
  job_title: string;
  companyName: string;
  companyDescription: string;
  jobDescription: string;
  location: string;
  salaryRange: string;
  salaryDetails: string;
  employmentType: string;
  experienceLevel: string;
  education: string;
  requirements: string[];
  skills: string[];
  benefits: string[];
  responsibilities: string[];
  industry: string;
  postedDate: string;
  applicationDeadline: string;
  department: string;
  hiringManager: string;
  companySize: string;
  fundingStage: string;
  technologyStack: string[];
  cultureAspects: string[];
  fullText: string;
  url: string;
  scrapedAt: string;
  wordCount: number;
};

type CareerImportDto = {
  id: string;
  queueJobId: string;
  status: 'queued' | 'processing' | 'ready' | 'failed' | 'dismissed' | 'resolved';
  stage: string;
  progress: number;
  sourceUrl: string;
  draft?: CareerImportDraft;
  errorCode?: string | null;
  errorMessage?: string | null;
};

function getImportErrorMessage(job: CareerImportDto): string {
  if (job.errorMessage?.trim()) return job.errorMessage;
  if (job.errorCode === 'POSTING_EMPTY') {
    return 'The page opened, but no complete job description was available.';
  }
  if (job.errorCode === 'INVALID_URL') return 'Enter a valid job posting URL.';
  return 'We couldn’t import this job posting. You can retry or paste the description.';
}

function toJobPosting(draft: CareerImportDraft): JobPosting {
  return {
    job_title: draft.jobTitle,
    companyName: draft.companyName,
    companyDescription: draft.companyDescription,
    jobDescription: draft.jobDescription,
    location: draft.location,
    salaryRange: draft.salaryRange,
    salaryDetails: draft.salaryDetails,
    employmentType: draft.employmentType,
    experienceLevel: draft.experienceLevel,
    education: draft.education,
    requirements: draft.requirements,
    skills: draft.skills,
    benefits: draft.benefits,
    responsibilities: draft.responsibilities,
    industry: draft.industry,
    postedDate: draft.postedDate,
    applicationDeadline: draft.applicationDeadline,
    department: draft.department,
    hiringManager: draft.hiringManager,
    companySize: draft.companySize,
    fundingStage: draft.fundingStage,
    technologyStack: draft.technologyStack,
    cultureAspects: draft.cultureAspects,
    fullText: draft.fullText,
    url: draft.url,
    scrapedAt: draft.scrapedAt,
    wordCount: draft.wordCount,
  };
}

export const meta: MetaFunction = () => [
  { title: 'New Application | career' },
  { name: 'description', content: 'Add a new job application to track your search progress.' },
];

export async function loader({ context }: LoaderFunctionArgs) {
  const user = context.get(userContext);
  return { user };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const user = context.get(userContext);
  if (!user) {
    throw new Response('User not found', { status: 401 });
  }
  const formData = await request.formData();
  const position = formData.get('position') as string;
  const companyName = formData.get('company') as string;
  const statusValue = formData.get('status');
  if (typeof statusValue !== 'string' || !isJobApplicationStatus(statusValue)) {
    throw new Response('Invalid application status', { status: 400 });
  }
  const status = statusValue as JobApplicationStatus;
  const location = formData.get('location') as string;
  const salaryQuoted = formData.get('salaryQuoted') as string;
  const importId = formData.get('importId');
  const jobPostingDataValue = formData.get('jobPostingData');

  if (!position || !companyName) {
    throw new Response('Position and company are required', { status: 400 });
  }

  let jobPostingData: { url?: string; jobDescription?: string } = {};
  if (typeof jobPostingDataValue === 'string' && jobPostingDataValue) {
    try {
      const parsed = JSON.parse(jobPostingDataValue) as unknown;
      if (isObject(parsed)) {
        const value = parsed as { url?: unknown; jobDescription?: unknown };
        jobPostingData = {
          url: typeof value.url === 'string' ? value.url : undefined,
          jobDescription:
            typeof value.jobDescription === 'string' ? value.jobDescription : undefined,
        };
      }
    } catch {
      throw new Response('The imported job details are invalid. Please retry the import.', {
        status: 400,
      });
    }
  }

  let salaryExpectation: number | null = null;
  if (salaryQuoted) {
    const cleaned = salaryQuoted.replace(/[$,\s]/g, '');
    const dollars = Number(cleaned);
    if (Number.isFinite(dollars)) {
      salaryExpectation = dollars * 100;
    }
  }

  try {
    const application = await JobApplicationsService.createApplication(user.id, {
      companyName,
      position,
      status,
      location: location || null,
      salaryExpectation,
      jobPostingUrl: jobPostingData.url || null,
      notes: jobPostingData.jobDescription || null,
    });

    if (typeof importId === 'string' && importId) {
      const importedJob = await CareerImportRepository.getById(db, user.id, importId);
      if (importedJob) {
        await CareerImportRepository.update(db, importedJob.id, {
          status: 'resolved',
          resolvedAt: new Date().toISOString(),
        });
      }
    }

    return redirect(`/applications/${application.id}`);
  } catch (error) {
    logger.error('Error creating job application', error, { owner_userid: user.id });
    throw new Response('Failed to create job application. Please try again.', { status: 500 });
  }
}

export default function CreateJobApplication() {
  const apiBaseUrl = useApiBaseUrl();
  const [inputMethod, setInputMethod] = useState<'manual' | 'url' | 'paste'>('url');
  const [scrapedData, setScrapedData] = useState<JobPosting | null>(null);
  const [pastedDescription, setPastedDescription] = useState('');
  const [url, setUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapingError, setScrapingError] = useState<string | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [importJob, setImportJob] = useState<CareerImportDto | null>(null);

  const applyImport = (job: CareerImportDto) => {
    setImportId(job.id);
    setImportJob(job);
    if (job.status === 'ready' && job.draft) {
      setScrapedData(toJobPosting(job.draft));
      setInputMethod('manual');
      setIsScraping(false);
    }
  };

  const refreshImport = async (id: string) => {
    const response = await fetch(`/api/job/import?importId=${encodeURIComponent(id)}`);
    if (!response.ok) return;
    const result = (await response.json()) as { import?: CareerImportDto | null };
    if (result.import) applyImport(result.import);
  };

  useEffect(() => {
    void fetch('/api/job/import')
      .then((response) => response.json() as Promise<{ imports?: CareerImportDto[] }>)
      .then((result) => {
        const latest = result.imports?.[0];
        if (latest) applyImport(latest);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (
      !importJob ||
      !importId ||
      ['ready', 'failed', 'dismissed', 'resolved'].includes(importJob.status)
    ) {
      return;
    }
    const interval = window.setInterval(() => void refreshImport(importId), 2500);
    return () => window.clearInterval(interval);
  }, [importId, importJob]);

  useEffect(() => {
    if (
      !apiBaseUrl ||
      !importJob ||
      !importId ||
      ['ready', 'failed', 'dismissed', 'resolved'].includes(importJob.status)
    ) {
      return;
    }
    const apiUrl = new URL('/api/finance/import/ws', apiBaseUrl);
    apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(apiUrl);
    socket.onopen = () => socket.send(JSON.stringify({ type: 'subscribe' }));
    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as {
          data?: Array<{
            jobId: string;
            status: CareerImportDto['status'];
            stage: string;
            progress?: number;
            errorCode?: string;
            error?: string;
            draft?: CareerImportDraft;
          }>;
        };
        const job = parsed.data?.find((entry) => entry.jobId === importJob.queueJobId);
        if (!job) return;
        setImportJob((current) =>
          current
            ? {
                ...current,
                status: job.status,
                stage: job.stage,
                progress: job.progress ?? current.progress,
                errorCode: job.errorCode || current.errorCode,
                errorMessage: job.error || current.errorMessage,
                draft: job.draft,
              }
            : current,
        );
        if (job.status === 'ready' && job.draft) {
          setScrapedData(toJobPosting(job.draft));
          setInputMethod('manual');
          setIsScraping(false);
        }
      } catch {
        // The HTTP snapshot remains authoritative after a malformed event.
      }
    };
    return () => socket.close();
  }, [apiBaseUrl, importId, importJob]);

  const handleScrape = async () => {
    if (!url.trim()) return;
    setIsScraping(true);
    setScrapingError(null);

    try {
      const response = await fetch('/api/job/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', url }),
      });

      const result = (await response.json()) as { import?: CareerImportDto; message?: string };

      if (result.import) {
        applyImport(result.import);
      } else {
        setScrapingError(result.message || 'We couldn’t start the job import. Please try again.');
        setIsScraping(false);
      }
    } catch {
      setScrapingError('An unexpected error occurred.');
    } finally {
      setIsScraping(false);
    }
  };

  const handlePasteDescription = () => {
    if (pastedDescription.trim()) {
      const basicJobPosting: JobPosting = {
        job_title: '',
        companyName: '',
        companyDescription: '',
        jobDescription: pastedDescription,
        location: '',
        salaryRange: '',
        salaryDetails: '',
        employmentType: '',
        experienceLevel: '',
        education: '',
        requirements: [],
        skills: [],
        benefits: [],
        responsibilities: [],
        industry: '',
        postedDate: '',
        applicationDeadline: '',
        department: '',
        hiringManager: '',
        companySize: '',
        fundingStage: '',
        technologyStack: [],
        cultureAspects: [],
        fullText: pastedDescription,
        url: '',
        scrapedAt: new Date().toISOString(),
        wordCount: pastedDescription.split(' ').length,
      };
      setScrapedData(basicJobPosting);
      setInputMethod('manual');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent>
          {/* URL is the default way in */}
          {inputMethod === 'url' && (
            <>
              <div className="flex items-center gap-2">
                <Input
                  type="url"
                  name="url"
                  id="url"
                  placeholder="Paste job posting URL..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="h-11"
                  disabled={isScraping}
                  autoFocus
                />
                <Button
                  type="button"
                  onClick={handleScrape}
                  disabled={isScraping || !url.trim()}
                  className="h-11 shrink-0"
                  variant="default"
                  isLoading={isScraping}
                  loadingLabel="Scraping..."
                >
                  Import
                </Button>
              </div>
              {scrapingError && <p className="text-sm text-destructive mt-2">{scrapingError}</p>}
              <p className="mt-2 text-sm text-muted-foreground">
                or{' '}
                <button
                  type="button"
                  className="underline transition-colors"
                  onClick={() => setInputMethod('paste')}
                >
                  paste a description
                </button>
                {' · '}
                <button
                  type="button"
                  className="underline transition-colors"
                  onClick={() => setInputMethod('manual')}
                >
                  enter manually
                </button>
              </p>
            </>
          )}

          {importJob && !['ready', 'resolved'].includes(importJob.status) && (
            <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-sm">
              {importJob.status === 'failed' ? (
                <>
                  <p className="text-destructive">{getImportErrorMessage(importJob)}</p>
                  <div className="mt-2 flex gap-3">
                    {importJob.errorCode !== 'POSTING_EMPTY' && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={async () => {
                          const response = await fetch('/api/job/import', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'retry', importId: importJob.id }),
                          });
                          const result = (await response.json()) as { import?: CareerImportDto };
                          if (result.import) {
                            setIsScraping(true);
                            applyImport(result.import);
                          }
                        }}
                      >
                        Retry
                      </Button>
                    )}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => {
                        setImportJob(null);
                        setInputMethod('paste');
                      }}
                    >
                      Paste the description instead
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p>Importing job details… {importJob.progress}%</p>
                  <progress className="mt-2 h-2 w-full" value={importJob.progress} max="100" />
                  <p className="mt-1 text-muted-foreground">
                    {importJob.stage.replaceAll('-', ' ')}
                  </p>
                </>
              )}
            </div>
          )}

          {inputMethod === 'paste' && (
            <div className="space-y-2">
              <textarea
                id="pastedDescription"
                value={pastedDescription}
                onChange={(e) => setPastedDescription(e.target.value)}
                rows={8}
                placeholder="Paste the job description here..."
                className="w-full resize-none rounded-lg border border-border px-3 py-2"
                autoFocus
              />
              <div className="flex items-center gap-3">
                <Button
                  onClick={handlePasteDescription}
                  disabled={!pastedDescription.trim()}
                  variant="default"
                >
                  Use This Description
                </Button>
                <button
                  type="button"
                  className="text-sm text-muted-foreground underline transition-colors"
                  onClick={() => setInputMethod('url')}
                >
                  Use a job posting URL
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* shows once you've scraped a posting or picked manual entry */}
      {(inputMethod === 'manual' || scrapedData) && (
        <Card>
          <CardContent>
            {scrapedData && (
              <div className="mb-6 rounded-lg border border-border bg-muted/40 p-4">
                <h3 className="heading-3 text-foreground mb-4">Extracted Job Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {scrapedData.requirements.length > 0 && (
                    <div>
                      <h4 className="subheading-4 text-foreground mb-2">Requirements</h4>
                      <ul className="space-y-1">
                        {scrapedData.requirements.slice(0, 5).map((req, index) => (
                          <li
                            key={`req-${index}-${req.slice(0, 20)}`}
                            className="body-3 text-muted-foreground flex items-start gap-2"
                          >
                            <span className="mt-1">•</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {scrapedData.skills.length > 0 && (
                    <div>
                      <h4 className="subheading-4 text-foreground mb-2">Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {scrapedData.skills.slice(0, 8).map((skill, _index) => (
                          <span
                            key={`skill-${skill}`}
                            className="px-2 py-1 bg-accent/20 text-muted-foreground caption1 rounded-md"
                          >
                            {skill}
                          </span>
                        ))}
                        {scrapedData.skills.length > 8 && (
                          <span className="px-2 py-1 bg-accent/20 text-primary caption1 rounded-md italic">
                            +{scrapedData.skills.length - 8} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {scrapedData.companyDescription && (
                  <div className="mt-4">
                    <h4 className="subheading-4 text-foreground mb-2">Company Description</h4>
                    <p className="body-3 text-muted-foreground leading-relaxed">
                      {scrapedData.companyDescription.length > 200
                        ? `${scrapedData.companyDescription.substring(0, 200)}...`
                        : scrapedData.companyDescription}
                    </p>
                  </div>
                )}

                <div className="mt-4 border-t border-border pt-4">
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>{scrapedData.wordCount} words</span>
                    {scrapedData.url && <span>URL captured</span>}
                    <span>{new Date(scrapedData.scrapedAt).toLocaleDateString('en-US')}</span>
                  </div>
                </div>
              </div>
            )}

            <Form method="post" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="position">Job Title *</label>
                  <Input
                    id="position"
                    name="position"
                    placeholder="e.g. Senior Software Engineer"
                    required
                    className="h-11"
                    defaultValue={scrapedData?.job_title || ''}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="company">Company *</label>
                  <Input
                    id="company"
                    name="company"
                    placeholder="e.g. Google, Microsoft"
                    required
                    className="h-11"
                    defaultValue={scrapedData?.companyName || ''}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <DatePicker
                    id="startDate"
                    name="startDate"
                    label="Application Date *"
                    defaultValue={todayDateInput()}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="status">Status</label>
                  <Select name="status" defaultValue={JobApplicationStatus.APPLIED}>
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(JobApplicationStatus).map((status) => (
                        <SelectItem key={status} value={status}>
                          {humanizeIdentifier(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="location">Location</label>
                <Input
                  id="location"
                  name="location"
                  placeholder="e.g. San Francisco, CA or Remote"
                  className="h-11"
                  defaultValue={scrapedData?.location || ''}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="jobPosting">Job Description</label>
                <textarea
                  id="jobPosting"
                  name="jobPosting"
                  rows={6}
                  placeholder="Paste the job description here..."
                  className="w-full resize-none rounded-lg border border-border px-3 py-2"
                  defaultValue={scrapedData ? scrapedData.jobDescription : ''}
                />
                {/* the action pulls the scraped fields into their own columns */}
                {scrapedData && (
                  <input type="hidden" name="jobPostingData" value={JSON.stringify(scrapedData)} />
                )}
                {importId && <input type="hidden" name="importId" value={importId} />}
              </div>

              <div className="space-y-2">
                <label htmlFor="salaryQuoted">Salary Range</label>
                <Input
                  id="salaryQuoted"
                  name="salaryQuoted"
                  placeholder="e.g. $120k - $150k or $80/hour"
                  className="h-11"
                />
              </div>

              <div className="pt-4 border-t border-border">
                <h3 className="heading-3 text-foreground mb-4">Recruiter Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="recruiterName">Recruiter Name</label>
                    <Input
                      id="recruiterName"
                      name="recruiterName"
                      placeholder="e.g. John Smith"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="recruiterEmail">Recruiter Email</label>
                    <Input
                      id="recruiterEmail"
                      name="recruiterEmail"
                      type="email"
                      placeholder="e.g. john.smith@company.com"
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  <label htmlFor="recruiterLinkedin">Recruiter LinkedIn URL</label>
                  <Input
                    id="recruiterLinkedin"
                    name="recruiterLinkedin"
                    type="url"
                    placeholder="e.g. https://linkedin.com/in/johnsmith"
                    className="h-11"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <Button type="submit" className="flex-1 h-11 font-medium" variant="default">
                  Create Application
                </Button>
                <Link
                  to="/applications"
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-border bg-card subheading-4 text-muted-foreground transition-colors"
                >
                  Cancel
                </Link>
              </div>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
