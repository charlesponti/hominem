import type { JobApplicationRecord as ApplicationWithCompany } from '@hominem/db';
import { replaceUnderscores } from '@hominem/utils/text';
import {
  DatePicker,
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
import { Briefcase, Calendar, DollarSign, ExternalLink, MapPin, TrendingUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Form, useNavigation } from 'react-router';

import { formatCentsInput, formatDateInput } from '~/lib/utils/applicationForm';
import { formatApplicationDate, formatApplicationSalary } from '~/lib/utils/applicationUtils';
import { JobApplicationStatus } from '~/types/career';

type EditingSection = 'details' | 'company' | 'compensation' | 'outcomes' | 'recruiter' | null;

interface OverviewTabProps {
  application: ApplicationWithCompany;
  company: ApplicationWithCompany['company'];
}

function SectionHeader({
  title,
  isEditing,
  onEdit,
  onCancel,
  testId,
  extra,
}: {
  title: string;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  testId: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="w-full flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <CardTitle className="heading-4">{title}</CardTitle>
        {extra}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-testid={testId}
        onClick={() => (isEditing ? onCancel() : onEdit())}
      >
        {isEditing ? 'Cancel' : 'Edit'}
      </Button>
    </div>
  );
}

function FormActions({
  isSubmitting,
  onCancel,
  saveTestId,
}: {
  isSubmitting: boolean;
  onCancel: () => void;
  saveTestId: string;
}) {
  return (
    <div className="flex gap-2 pt-2">
      <Button
        type="submit"
        size="sm"
        disabled={isSubmitting}
        isLoading={isSubmitting}
        data-testid={saveTestId}
      >
        Save
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

function DateField({
  id,
  name,
  label,
  defaultValue,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: Date | string | null | undefined;
}) {
  const [value, setValue] = useState<Date | undefined>(() => {
    if (!defaultValue) return undefined;
    const d = typeof defaultValue === 'string' ? new Date(defaultValue) : defaultValue;
    return Number.isNaN(d.getTime()) ? undefined : d;
  });

  return (
    <div className="space-y-2">
      <DatePicker
        id={id}
        label={label}
        value={value}
        onSelect={(next) => setValue(next)}
        placeholder={`Pick ${label.toLowerCase()}`}
        containerClassName="min-w-0"
      />
      <input type="hidden" name={name} value={value ? formatDateInput(value) : ''} />
    </div>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <Label htmlFor={htmlFor} className="subheading-4 text-muted-foreground">
      {children}
    </Label>
  );
}

function DisplayField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="subheading-4 text-muted-foreground">{label}</span>
      <div className="text-foreground mt-1">{children}</div>
    </div>
  );
}

function EmptyValue() {
  return <span className="text-muted-foreground italic">Not specified</span>;
}

export function ApplicationOverviewTab({ application, company }: OverviewTabProps) {
  const [editingSection, setEditingSection] = useState<EditingSection>(null);
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const wasSubmitting = useRef(isSubmitting);

  useEffect(() => {
    if (wasSubmitting.current && !isSubmitting) {
      setEditingSection(null);
    }
    wasSubmitting.current = isSubmitting;
  }, [isSubmitting]);

  const openSection = (section: EditingSection) => () => setEditingSection(section);
  const closeSection = () => setEditingSection(null);

  return (
    <div className="space-y-2">
      {/* Application Details */}
      <Card>
        <CardHeader>
          <SectionHeader
            title="Application Details"
            isEditing={editingSection === 'details'}
            onEdit={openSection('details')}
            onCancel={closeSection}
            testId="application-details-edit"
            extra={
              application.jobPostingUrl && editingSection !== 'details' ? (
                <a
                  href={application.jobPostingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors"
                  aria-label="View job posting"
                >
                  <ExternalLink className="size-4" />
                </a>
              ) : null
            }
          />
        </CardHeader>
        <CardContent>
          {editingSection === 'details' ? (
            <Form method="post" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldLabel htmlFor="position">Job Title *</FieldLabel>
                  <Input
                    id="position"
                    name="position"
                    required
                    defaultValue={application.position}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="status">Status</FieldLabel>
                  <Select name="status" defaultValue={application.status}>
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(JobApplicationStatus).map((status) => (
                        <SelectItem key={status} value={status}>
                          {replaceUnderscores(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="location">Location</FieldLabel>
                  <Input
                    id="location"
                    name="location"
                    defaultValue={application.location || ''}
                    placeholder="e.g. San Francisco, CA or Remote"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="source">Source</FieldLabel>
                  <Input
                    id="source"
                    name="source"
                    defaultValue={application.source || ''}
                    placeholder="e.g. LinkedIn, Referral"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="jobPostingUrl">Job Posting URL</FieldLabel>
                  <Input
                    id="jobPostingUrl"
                    name="jobPostingUrl"
                    type="url"
                    defaultValue={application.jobPostingUrl || ''}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="link">Application Link</FieldLabel>
                  <Input
                    id="link"
                    name="link"
                    type="url"
                    defaultValue={application.link || ''}
                    placeholder="Tracking / ATS link"
                  />
                </div>
                <DateField
                  id="startDate"
                  name="startDate"
                  label="Start Date"
                  defaultValue={application.startDate}
                />
              </div>

              <div className="pt-2 border-t border-border space-y-4">
                <p className="subheading-4 text-muted-foreground">Pipeline dates</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DateField
                    id="applicationDate"
                    name="applicationDate"
                    label="Application Date"
                    defaultValue={application.applicationDate}
                  />
                  <DateField
                    id="responseDate"
                    name="responseDate"
                    label="Response Date"
                    defaultValue={application.responseDate}
                  />
                  <DateField
                    id="firstInterviewDate"
                    name="firstInterviewDate"
                    label="First Interview"
                    defaultValue={application.firstInterviewDate}
                  />
                  <DateField
                    id="offerDate"
                    name="offerDate"
                    label="Offer Date"
                    defaultValue={application.offerDate}
                  />
                  <DateField
                    id="decisionDate"
                    name="decisionDate"
                    label="Decision Date"
                    defaultValue={application.decisionDate}
                  />
                  <DateField
                    id="endDate"
                    name="endDate"
                    label="End Date"
                    defaultValue={application.endDate}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="jobPosting">Job Description</FieldLabel>
                <textarea
                  id="jobPosting"
                  name="jobPosting"
                  rows={6}
                  defaultValue={application.jobPosting || ''}
                  placeholder="Paste the job description..."
                  className="w-full resize-none rounded-lg border border-border px-3 py-2"
                />
              </div>

              <FormActions
                isSubmitting={isSubmitting}
                onCancel={closeSection}
                saveTestId="application-details-save"
              />
            </Form>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2">
                <Briefcase className="size-4 shrink-0" />
                <span>{application.position}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="size-4 shrink-0" />
                <span>{formatApplicationDate(application.startDate)}</span>
              </div>
              {application.salaryQuoted && (
                <div className="flex items-center gap-2">
                  <DollarSign className="size-4 shrink-0" />
                  <span>{application.salaryQuoted}</span>
                </div>
              )}
              {application.source && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 shrink-0" />
                  <span>{application.source}</span>
                </div>
              )}
              {application.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 shrink-0" />
                  <span>{application.location}</span>
                </div>
              )}
              {application.jobPosting && (
                <div className="mt-2 pt-2 border-t border-border">
                  <span className="subheading-4 text-muted-foreground">Job Description</span>
                  <p className="text-muted-foreground whitespace-pre-wrap mt-1 body-3 line-clamp-6">
                    {application.jobPosting}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <SectionHeader
            title="Company Information"
            isEditing={editingSection === 'company'}
            onEdit={openSection('company')}
            onCancel={closeSection}
            testId="application-company-edit"
          />
        </CardHeader>
        <CardContent>
          {editingSection === 'company' ? (
            <Form method="post" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldLabel htmlFor="companyName">Company Name *</FieldLabel>
                  <Input
                    id="companyName"
                    name="companyName"
                    required
                    defaultValue={company?.name || ''}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="companyWebsite">Website</FieldLabel>
                  <Input
                    id="companyWebsite"
                    name="companyWebsite"
                    type="url"
                    defaultValue={company?.website || ''}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="companyIndustry">Industry</FieldLabel>
                  <Input
                    id="companyIndustry"
                    name="companyIndustry"
                    defaultValue={company?.industry || ''}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="companySize">Company Size</FieldLabel>
                  <Input
                    id="companySize"
                    name="companySize"
                    type="number"
                    min={0}
                    defaultValue={company?.size ?? ''}
                    placeholder="e.g. 250"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <FieldLabel htmlFor="companyLocation">Company Location</FieldLabel>
                  <Input
                    id="companyLocation"
                    name="companyLocation"
                    defaultValue={company?.location || ''}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <FieldLabel htmlFor="companyDescription">Description</FieldLabel>
                  <textarea
                    id="companyDescription"
                    name="companyDescription"
                    rows={3}
                    defaultValue={company?.description || ''}
                    className="w-full resize-none rounded-lg border border-border px-3 py-2"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <FieldLabel htmlFor="companyNotes">Research Notes</FieldLabel>
                  <textarea
                    id="companyNotes"
                    name="companyNotes"
                    rows={4}
                    defaultValue={application.companyNotes || ''}
                    className="w-full resize-none rounded-lg border border-border px-3 py-2"
                  />
                </div>
              </div>
              <FormActions
                isSubmitting={isSubmitting}
                onCancel={closeSection}
                saveTestId="application-company-save"
              />
            </Form>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DisplayField label="Company Name">
                  {company?.name || 'Unknown Company'}
                </DisplayField>
                {company?.website && (
                  <DisplayField label="Website">
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary"
                    >
                      {company.website}
                    </a>
                  </DisplayField>
                )}
                {company?.industry && (
                  <DisplayField label="Industry">{company.industry}</DisplayField>
                )}
                {company?.size != null && (
                  <DisplayField label="Company Size">{company.size}</DisplayField>
                )}
                {company?.location && (
                  <DisplayField label="Company Location">{company.location}</DisplayField>
                )}
              </div>
              {company?.description && (
                <div className="mt-6 pt-6 border-t border-border">
                  <span className="subheading-4 text-muted-foreground">Description</span>
                  <p className="text-muted-foreground whitespace-pre-wrap mt-1">
                    {company.description}
                  </p>
                </div>
              )}
              <div className="mt-6 pt-6 border-t border-border">
                <span className="subheading-4 text-muted-foreground">Research Notes</span>
                <p className="text-muted-foreground whitespace-pre-wrap mt-1">
                  {application.companyNotes || <EmptyValue />}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Compensation */}
      <Card>
        <CardHeader>
          <SectionHeader
            title="Compensation"
            isEditing={editingSection === 'compensation'}
            onEdit={openSection('compensation')}
            onCancel={closeSection}
            testId="application-compensation-edit"
          />
        </CardHeader>
        <CardContent>
          {editingSection === 'compensation' ? (
            <Form method="post" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldLabel htmlFor="salaryQuoted">Quoted Range (text)</FieldLabel>
                  <Input
                    id="salaryQuoted"
                    name="salaryQuoted"
                    defaultValue={application.salaryQuoted || ''}
                    placeholder="e.g. $120k - $150k"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="salaryAccepted">Accepted (text)</FieldLabel>
                  <Input
                    id="salaryAccepted"
                    name="salaryAccepted"
                    defaultValue={application.salaryAccepted || ''}
                  />
                </div>
                {(
                  [
                    ['salaryExpected', 'Expected (USD)', application.salaryExpected],
                    ['salaryRequested', 'Requested (USD)', application.salaryRequested],
                    ['salaryOffered', 'Offered (USD)', application.salaryOffered],
                    ['salaryNegotiated', 'Negotiated (USD)', application.salaryNegotiated],
                    ['salaryFinal', 'Final Salary (USD)', application.salaryFinal],
                    ['totalCompOffered', 'Total Comp Offered (USD)', application.totalCompOffered],
                    ['totalCompFinal', 'Total Comp Final (USD)', application.totalCompFinal],
                    ['bonusOffered', 'Bonus Offered (USD)', application.bonusOffered],
                    ['bonusFinal', 'Bonus Final (USD)', application.bonusFinal],
                  ] as const
                ).map(([name, label, value]) => (
                  <div key={name} className="space-y-2">
                    <FieldLabel htmlFor={name}>{label}</FieldLabel>
                    <Input
                      id={name}
                      name={name}
                      inputMode="decimal"
                      defaultValue={formatCentsInput(value)}
                      placeholder="e.g. 150000"
                    />
                  </div>
                ))}
                <div className="space-y-2">
                  <FieldLabel htmlFor="equityOffered">Equity Offered</FieldLabel>
                  <Input
                    id="equityOffered"
                    name="equityOffered"
                    defaultValue={application.equityOffered || ''}
                    placeholder="e.g. 0.1%"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="equityFinal">Equity Final</FieldLabel>
                  <Input
                    id="equityFinal"
                    name="equityFinal"
                    defaultValue={application.equityFinal || ''}
                  />
                </div>
              </div>
              <FormActions
                isSubmitting={isSubmitting}
                onCancel={closeSection}
                saveTestId="application-compensation-save"
              />
            </Form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DisplayField label="Quoted Range">
                {application.salaryQuoted || <EmptyValue />}
              </DisplayField>
              <DisplayField label="Accepted">
                {application.salaryAccepted || <EmptyValue />}
              </DisplayField>
              <DisplayField label="Expected">
                {formatApplicationSalary(application.salaryExpected)}
              </DisplayField>
              <DisplayField label="Offered">
                {formatApplicationSalary(application.salaryOffered)}
              </DisplayField>
              <DisplayField label="Final">
                {formatApplicationSalary(application.salaryFinal)}
              </DisplayField>
              <DisplayField label="Total Comp Offered">
                {formatApplicationSalary(application.totalCompOffered)}
              </DisplayField>
              <DisplayField label="Equity Offered">
                {application.equityOffered || <EmptyValue />}
              </DisplayField>
              <DisplayField label="Bonus Offered">
                {formatApplicationSalary(application.bonusOffered)}
              </DisplayField>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outcomes */}
      <Card>
        <CardHeader>
          <SectionHeader
            title="Outcomes & Notes"
            isEditing={editingSection === 'outcomes'}
            onEdit={openSection('outcomes')}
            onCancel={closeSection}
            testId="application-outcomes-edit"
          />
        </CardHeader>
        <CardContent>
          {editingSection === 'outcomes' ? (
            <Form method="post" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldLabel htmlFor="rejectionReason">Rejection Reason</FieldLabel>
                  <Input
                    id="rejectionReason"
                    name="rejectionReason"
                    defaultValue={application.rejectionReason || ''}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="withdrawalReason">Withdrawal Reason</FieldLabel>
                  <Input
                    id="withdrawalReason"
                    name="withdrawalReason"
                    defaultValue={application.withdrawalReason || ''}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <FieldLabel htmlFor="phoneScreen">Phone Screen Notes</FieldLabel>
                  <Input
                    id="phoneScreen"
                    name="phoneScreen"
                    defaultValue={application.phoneScreen || ''}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <FieldLabel htmlFor="negotiationNotes">Negotiation Notes</FieldLabel>
                  <textarea
                    id="negotiationNotes"
                    name="negotiationNotes"
                    rows={4}
                    defaultValue={application.negotiationNotes || ''}
                    className="w-full resize-none rounded-lg border border-border px-3 py-2"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input type="hidden" name="reference" value="false" />
                  <input
                    id="reference"
                    name="reference"
                    type="checkbox"
                    value="true"
                    defaultChecked={application.reference}
                    className="size-4 rounded border-border"
                  />
                  <FieldLabel htmlFor="reference">Used as reference</FieldLabel>
                </div>
              </div>
              <FormActions
                isSubmitting={isSubmitting}
                onCancel={closeSection}
                saveTestId="application-outcomes-save"
              />
            </Form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DisplayField label="Rejection Reason">
                {application.rejectionReason || <EmptyValue />}
              </DisplayField>
              <DisplayField label="Withdrawal Reason">
                {application.withdrawalReason || <EmptyValue />}
              </DisplayField>
              <DisplayField label="Phone Screen">
                {application.phoneScreen || <EmptyValue />}
              </DisplayField>
              <DisplayField label="Reference">{application.reference ? 'Yes' : 'No'}</DisplayField>
              <div className="md:col-span-2">
                <DisplayField label="Negotiation Notes">
                  {application.negotiationNotes ? (
                    <p className="whitespace-pre-wrap">{application.negotiationNotes}</p>
                  ) : (
                    <EmptyValue />
                  )}
                </DisplayField>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recruiter */}
      <Card>
        <CardHeader>
          <SectionHeader
            title="Recruiter Information"
            isEditing={editingSection === 'recruiter'}
            onEdit={openSection('recruiter')}
            onCancel={closeSection}
            testId="application-recruiter-edit"
          />
        </CardHeader>
        <CardContent>
          {editingSection === 'recruiter' ? (
            <Form method="post" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <FieldLabel htmlFor="recruiterName">Recruiter Name</FieldLabel>
                  <Input
                    id="recruiterName"
                    name="recruiterName"
                    placeholder="e.g. John Smith"
                    defaultValue={application.recruiterName || ''}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="recruiterEmail">Recruiter Email</FieldLabel>
                  <Input
                    id="recruiterEmail"
                    name="recruiterEmail"
                    type="email"
                    placeholder="e.g. john.smith@company.com"
                    defaultValue={application.recruiterEmail || ''}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="recruiterLinkedin">Recruiter LinkedIn URL</FieldLabel>
                <Input
                  id="recruiterLinkedin"
                  name="recruiterLinkedin"
                  type="url"
                  placeholder="e.g. https://linkedin.com/in/johnsmith"
                  defaultValue={application.recruiterLinkedin || ''}
                />
              </div>
              <FormActions
                isSubmitting={isSubmitting}
                onCancel={closeSection}
                saveTestId="application-recruiter-save"
              />
            </Form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DisplayField label="Recruiter Name">
                {application.recruiterName || <EmptyValue />}
              </DisplayField>
              <DisplayField label="Recruiter Email">
                {application.recruiterEmail ? (
                  <a href={`mailto:${application.recruiterEmail}`} className="text-primary">
                    {application.recruiterEmail}
                  </a>
                ) : (
                  <EmptyValue />
                )}
              </DisplayField>
              <div className="md:col-span-2">
                <DisplayField label="Recruiter LinkedIn">
                  {application.recruiterLinkedin ? (
                    <a
                      href={application.recruiterLinkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary"
                    >
                      View Profile
                    </a>
                  ) : (
                    <EmptyValue />
                  )}
                </DisplayField>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
