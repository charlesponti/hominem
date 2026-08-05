import type { CareerApplicationWithRelations } from '@hominem/db';
import { useOutletContext } from 'react-router';

export default function ApplicationOverviewRoute() {
  const application = useOutletContext<CareerApplicationWithRelations>();

  return (
    <div className="space-y-6">
      <section>
        <h2 className="heading-4 mb-3">Details</h2>
        <div className="grid grid-cols-2 gap-4">
          {application.source && (
            <div>
              <p className="footnote text-muted-foreground">Source</p>
              <p className="body-3">{application.source}</p>
            </div>
          )}
          {application.appliedAt && (
            <div>
              <p className="footnote text-muted-foreground">Applied</p>
              <p className="body-3">{application.appliedAt}</p>
            </div>
          )}
          {application.salaryExpectation != null && (
            <div>
              <p className="footnote text-muted-foreground">Salary Expectation</p>
              <p className="body-3">${(application.salaryExpectation / 100).toLocaleString()}</p>
            </div>
          )}
          {application.jobPostingUrl && (
            <div>
              <p className="footnote text-muted-foreground">Job Posting</p>
              <a
                href={application.jobPostingUrl}
                target="_blank"
                rel="noreferrer"
                className="body-3 text-blue-600 hover:underline"
              >
                View posting
              </a>
            </div>
          )}
          {application.location && (
            <div>
              <p className="footnote text-muted-foreground">Location</p>
              <p className="body-3">{application.location}</p>
            </div>
          )}
        </div>
      </section>

      {application.notes && (
        <section>
          <h2 className="heading-4 mb-3">Notes</h2>
          <p className="body-2 text-muted-foreground whitespace-pre-wrap">{application.notes}</p>
        </section>
      )}

      {application.offer && (
        <section>
          <h2 className="heading-4 mb-3">Offer</h2>
          <div className="rounded-lg border border-border p-4 space-y-2">
            {application.offer.baseSalary != null && (
              <p className="body-3">
                Base: ${(application.offer.baseSalary / 100).toLocaleString()}
              </p>
            )}
            {application.offer.equity && (
              <p className="body-3">Equity: {application.offer.equity}</p>
            )}
            {application.offer.bonus != null && (
              <p className="body-3">Bonus: ${(application.offer.bonus / 100).toLocaleString()}</p>
            )}
            {application.offer.totalComp != null && (
              <p className="body-3">
                Total: ${(application.offer.totalComp / 100).toLocaleString()}
              </p>
            )}
            {application.offer.decision && (
              <p className="body-3">Decision: {application.offer.decision}</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
