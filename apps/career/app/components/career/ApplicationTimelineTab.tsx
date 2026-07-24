import type { JobApplicationRecord as ApplicationWithCompany } from '@hominem/db';
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@ponti-studios/ui/forms';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
} from '@ponti-studios/ui/primitives';
import { useState } from 'react';
import { Form } from 'react-router';

import { jsonArray } from '~/lib/db-json';
import { replaceUnderscores } from '@hominem/utils/text';

type InterviewEntry = {
  date: string;
  interviewer?: string;
  notes?: string;
  type: string;
};

interface TimelineTabProps {
  application: ApplicationWithCompany;
  applicationId: string;
}

export function ApplicationTimelineTab({ application }: TimelineTabProps) {
  const [showAddInterview, setShowAddInterview] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="heading-3 text-foreground">Application Timeline</h3>
        <Button onClick={() => setShowAddInterview(true)}>Add Interview</Button>
      </div>

      {/* Add Interview Form */}
      {showAddInterview && (
        <Card>
          <CardHeader>
            <CardTitle className="heading-4">Add Interview</CardTitle>
          </CardHeader>
          <CardContent>
            <Form method="post" onSubmit={() => setShowAddInterview(false)} className="space-y-4">
              <input type="hidden" name="operation" value="add_interview" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="interviewType" className="subheading-4 text-foreground">
                    Interview Type
                  </Label>
                  <Select name="interviewType" defaultValue="phone">
                    <SelectTrigger id="interviewType" className="w-full">
                      <SelectValue placeholder="Select interview type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone">Phone Screen</SelectItem>
                      <SelectItem value="video">Video Interview</SelectItem>
                      <SelectItem value="onsite">Onsite Interview</SelectItem>
                      <SelectItem value="technical">Technical Interview</SelectItem>
                      <SelectItem value="final">Final Interview</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="interviewDate" className="subheading-4 text-foreground">
                    Date & Time
                  </Label>
                  <Input id="interviewDate" name="interviewDate" type="datetime-local" required />
                </div>
              </div>

              <div>
                <Label htmlFor="interviewer" className="subheading-4 text-foreground">
                  Interviewer
                </Label>
                <Input
                  id="interviewer"
                  name="interviewer"
                  placeholder="Name or role of interviewer"
                />
              </div>

              <div>
                <Label htmlFor="interviewNotes" className="subheading-4 text-foreground">
                  Notes
                </Label>
                <Textarea
                  id="interviewNotes"
                  name="interviewNotes"
                  rows={3}
                  placeholder="Any additional notes about the interview"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">Add Interview</Button>
                <Button type="button" variant="outline" onClick={() => setShowAddInterview(false)}>
                  Cancel
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Timeline Display */}
      <div className="space-y-4">
        {/* Application Date */}
        <Card>
          <CardContent className="flex items-start gap-4 p-4">
            <div className="mt-1 size-3 shrink-0 rounded-full bg-primary" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between gap-3">
                <h4 className="subheading-4 text-foreground">Application Submitted</h4>
                <span className="body-3 text-muted-foreground">
                  {new Date(application.startDate).toLocaleDateString()}
                </span>
              </div>
              <p className="body-3 text-muted-foreground">Initial application submitted</p>
            </div>
          </CardContent>
        </Card>

        {/* Interviews */}
        {jsonArray<InterviewEntry>(application.interviewDates).map((interview) => (
          <Card key={interview.date}>
            <CardContent className="flex items-start gap-4 p-4">
              <div className="mt-1 size-3 shrink-0 rounded-full bg-accent" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-2">
                    <h4 className="subheading-4 text-foreground">
                      {interview.type.replace(/(\b\w)/g, (l) => l.toUpperCase())} Interview
                    </h4>
                    <Badge
                      variant="outline"
                      className="border-accent/30 bg-accent/10 text-foreground"
                    >
                      {replaceUnderscores(interview.type)}
                    </Badge>
                  </div>
                  <span className="body-3 text-muted-foreground">
                    {new Date(interview.date).toLocaleDateString()}
                  </span>
                </div>
                {interview.interviewer ? (
                  <p className="body-3 text-muted-foreground">with {interview.interviewer}</p>
                ) : null}
                {interview.notes ? (
                  <p className="mt-1 body-3 text-foreground/90">{interview.notes}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
