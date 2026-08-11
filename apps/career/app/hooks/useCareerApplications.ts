import { useSuspenseQuery } from '@tanstack/react-query';

import type { JobApplicationCard } from '~/lib/career/queries/job-applications';

type ApplicationsResponse = { applications: JobApplicationCard[] } | { error: string };

export function useCareerApplications() {
  return useSuspenseQuery({
    queryKey: ['career', 'applications'],
    queryFn: async () => {
      const res = await fetch('/api/career/applications');
      const body = (await res.json()) as ApplicationsResponse;
      if (!res.ok || 'error' in body) {
        throw new Error('error' in body ? body.error : 'Failed to load applications');
      }
      return body.applications;
    },
  });
}
