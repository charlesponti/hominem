import { humanizeIdentifier } from '@hominem/utils/text';
import {
  DateField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  todayDateInput,
} from '@ponti-studios/ui/forms';
import { Button, Card, CardContent, Label } from '@ponti-studios/ui/primitives';
import { useState } from 'react';
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Form, Link, redirect } from 'react-router';

import type { JobScrapeApiRequest, JobScrapeApiResponse } from '~/lib/api-contracts';
import { logger } from '~/lib/logger';
import { userContext } from '~/lib/middleware';
import { JobApplicationsService } from '~/lib/services/job-applications.service';
import type { JobPosting } from '~/lib/services/job-scraping.service';
import { isJobApplicationStatus, JobApplicationStatus } from '~/types/career';

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

  if (!position || !companyName) {
    throw new Response('Position and company are required', { status: 400 });
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
    });

    return redirect(`/applications/${application.id}`);
  } catch (error) {
    logger.error('Error creating job application', error, { owner_userid: user.id });
    throw new Response('Failed to create job application. Please try again.', { status: 500 });
  }
}

export default function CreateJobApplication() {
  const [inputMethod, setInputMethod] = useState<'manual' | 'url' | 'paste'>('url');
  const [scrapedData, setScrapedData] = useState<JobPosting | null>(null);
  const [pastedDescription, setPastedDescription] = useState('');
  const [url, setUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapingError, setScrapingError] = useState<string | null>(null);

  const handleScrapedData = (data: JobPosting) => {
    setScrapedData(data);
    setInputMethod('manual');
  };

  const handleScrape = async () => {
    if (!url.trim()) return;
    setIsScraping(true);
    setScrapingError(null);

    try {
      const response = await fetch('/api/job/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url } satisfies JobScrapeApiRequest),
      });

      const result: JobScrapeApiResponse = await response.json();

      if (result.job_posting) {
        handleScrapedData(result.job_posting);
      } else {
        setScrapingError(result.error || 'Failed to scrape job posting.');
      }
    } catch {
      setScrapingError('An unexpected error occurred.');
    } finally {
      setIsScraping(false);
    }
  };

  const handlePasteDescription = () => {
    if (pastedDescription.trim()) {
      // Create a basic JobPosting object from pasted text
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
      {/* Input Method */}
      <Card>
        <CardContent>
          {/* URL input — default / primary path */}
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

          {/* Paste Description */}
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

      {/* Manual Form — shown after URL scrape or when entering manually */}
      {(inputMethod === 'manual' || scrapedData) && (
        <Card>
          <CardContent>
            {/* Scraped Data Preview */}
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
                  <Label htmlFor="position">Job Title *</Label>
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
                  <Label htmlFor="company">Company *</Label>
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
                  <DateField
                    id="startDate"
                    name="startDate"
                    label="Application Date *"
                    defaultValue={todayDateInput()}
                    placeholder="Pick application date"
                    containerClassName="min-w-0"
                    captionLayout="dropdown"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
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
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  placeholder="e.g. San Francisco, CA or Remote"
                  className="h-11"
                  defaultValue={scrapedData?.location || ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobPosting">Job Description</Label>
                <textarea
                  id="jobPosting"
                  name="jobPosting"
                  rows={6}
                  placeholder="Paste the job description here..."
                  className="w-full resize-none rounded-lg border border-border px-3 py-2"
                  defaultValue={scrapedData ? scrapedData.jobDescription : ''}
                />
                {/* Hidden scrape metadata is normalized into dedicated columns by the action. */}
                {scrapedData && (
                  <input type="hidden" name="jobPostingData" value={JSON.stringify(scrapedData)} />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="salaryQuoted">Salary Range</Label>
                <Input
                  id="salaryQuoted"
                  name="salaryQuoted"
                  placeholder="e.g. $120k - $150k or $80/hour"
                  className="h-11"
                />
              </div>

              {/* Recruiter Information */}
              <div className="pt-4 border-t border-border">
                <h3 className="heading-3 text-foreground mb-4">Recruiter Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="recruiterName">Recruiter Name</Label>
                    <Input
                      id="recruiterName"
                      name="recruiterName"
                      placeholder="e.g. John Smith"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recruiterEmail">Recruiter Email</Label>
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
                  <Label htmlFor="recruiterLinkedin">Recruiter LinkedIn URL</Label>
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
