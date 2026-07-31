import type { JobApplicationRecord as ApplicationWithCompany } from '@hominem/db';
import { EmptyState } from '@ponti-studios/ui/feedback';
import { Button } from '@ponti-studios/ui/primitives';
import { Card, CardContent, CardHeader, CardTitle } from '@ponti-studios/ui/primitives';

interface FilesTabProps {
  application: ApplicationWithCompany;
}

export function ApplicationFilesTab({ application }: FilesTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="heading-3">Files & Documents</h3>
        <Button disabled className="text-xs sm:text-sm">
          <span className="hidden sm:inline">Upload File </span>(Coming Soon)
        </Button>
      </div>

      {/* Existing text content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {application.resume && (
          <Card>
            <CardHeader>
              <CardTitle>Resume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-3 rounded caption1 font-mono max-h-40 overflow-y-auto">
                {application.resume}
              </div>
            </CardContent>
          </Card>
        )}

        {application.coverLetter && (
          <Card>
            <CardHeader>
              <CardTitle>Cover Letter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-3 rounded caption1 font-mono max-h-40 overflow-y-auto">
                {application.coverLetter}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {!application.resume && !application.coverLetter && (
        <EmptyState
          title="No files yet"
          description="File upload functionality coming soon."
          variant="dashed"
        />
      )}
    </div>
  );
}
