import type { CareerApplicationWithRelations } from '@hominem/db';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ponti-studios/ui/primitives';
import { ExternalLinkIcon, PencilIcon } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useOutletContext } from 'react-router';

import { ApplicationEditor } from '~/components/career/applications/ApplicationEditor';
import { formatApplicationDate, formatApplicationSalary } from '~/lib/utils/applicationUtils';

interface DetailItemProps {
  label: string;
  children: ReactNode;
}

function DetailItem({ label, children }: DetailItemProps) {
  return (
    <div className="space-y-1">
      <dt className="footnote text-muted-foreground">{label}</dt>
      <dd className="body-3">{children}</dd>
    </div>
  );
}

export default function ApplicationOverviewRoute() {
  const application = useOutletContext<CareerApplicationWithRelations>();
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return <ApplicationEditor application={application} onCancel={() => setIsEditing(false)} />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Details</CardTitle>
            <CardDescription>Application information.</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <PencilIcon className="mr-2 size-4" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
            {application.source && <DetailItem label="Source">{application.source}</DetailItem>}
            {application.appliedAt && (
              <DetailItem label="Applied">
                {formatApplicationDate(application.appliedAt)}
              </DetailItem>
            )}
            {application.location && (
              <DetailItem label="Location">{application.location}</DetailItem>
            )}
            {application.salaryExpectation != null && (
              <DetailItem label="Salary Expectation">
                {formatApplicationSalary(application.salaryExpectation)}
              </DetailItem>
            )}
            {application.jobPostingUrl && (
              <DetailItem label="Job Posting">
                <a
                  href={application.jobPostingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-accent hover:underline"
                >
                  View posting
                  <ExternalLinkIcon className="size-3.5" />
                </a>
              </DetailItem>
            )}
          </dl>
        </CardContent>
      </Card>

      {application.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="body-2 text-muted-foreground whitespace-pre-wrap">{application.notes}</p>
          </CardContent>
        </Card>
      )}

      {application.offers.map((offer) => {
        const stage = application.stages.find((candidate) => candidate.id === offer.stageId);
        return (
          <Card key={offer.id}>
            <CardHeader>
              <CardTitle>{stage?.stage ?? 'Offer'}</CardTitle>
              <CardDescription>Compensation details.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                {offer.baseSalary != null && (
                  <DetailItem label="Base">{formatApplicationSalary(offer.baseSalary)}</DetailItem>
                )}
                {offer.equity && <DetailItem label="Equity">{offer.equity}</DetailItem>}
                {offer.bonus != null && (
                  <DetailItem label="Bonus">{formatApplicationSalary(offer.bonus)}</DetailItem>
                )}
                {offer.totalComp != null && (
                  <DetailItem label="Total Comp">
                    {formatApplicationSalary(offer.totalComp)}
                  </DetailItem>
                )}
                <DetailItem label="Decision">{offer.decision}</DetailItem>
              </dl>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
