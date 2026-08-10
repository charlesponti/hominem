import { Card, CardContent, CardHeader, CardTitle } from '@ponti-studios/ui/primitives';
import { Link } from 'react-router';

import type { TopCompany } from '~/lib/career/queries/dashboard-stats';

interface TopCompaniesInsightsProps {
  companies: TopCompany[];
}

export function TopCompaniesInsights({ companies }: TopCompaniesInsightsProps) {
  if (companies.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Top companies</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="body-3 text-muted-foreground">Companies you've applied to appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Top companies</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {companies.map((company, index) => (
            <li key={company.company} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="ui-eyebrow w-5 shrink-0 text-center">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <Link
                  to={`/applications?query=${encodeURIComponent(company.company)}`}
                  className="truncate text-sm font-medium text-foreground hover:underline"
                >
                  {company.company}
                </Link>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-sm">
                {company.hasOffer && (
                  <span className="caption1 rounded bg-success/10 px-1.5 py-0.5 text-success">
                    offer
                  </span>
                )}
                <span className="text-muted-foreground">{company.count}</span>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
