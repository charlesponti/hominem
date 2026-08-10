export type JobApplicationCard = {
  id: string;
  company: string;
  title: string;
  location: string | null;
  source: string | null;
  appliedAt: string | null;
  currentStage: string | null;
  status: string | null;
  jobPostingUrl: string | null;
  salaryExpectation: number | null;
  notes: string | null;
  stageCount: number;
  hasOffer: boolean;
};

export type JobApplicationFilter = {
  status?: string;
  source?: string;
  query?: string;
};

export type SortDirection = 'asc' | 'desc';

export type PaginationOptions = {
  page: number;
  pageSize: number;
};

export function filterJobApplications(
  applications: JobApplicationCard[],
  filter?: JobApplicationFilter,
): JobApplicationCard[] {
  let result = applications;

  if (filter?.status) {
    result = result.filter((a) => a.status === filter.status);
  }

  if (filter?.source) {
    result = result.filter((a) => a.source === filter.source);
  }

  if (filter?.query) {
    const query = filter.query.trim().toLowerCase();
    result = result.filter((a) => {
      const company = (a.company ?? '').toLowerCase();
      const title = (a.title ?? '').toLowerCase();
      return company.includes(query) || title.includes(query);
    });
  }

  return result;
}

export function sortJobApplications(
  applications: JobApplicationCard[],
  direction: SortDirection = 'desc',
): JobApplicationCard[] {
  return [...applications].sort((a, b) => {
    const dateA = a.appliedAt ?? '';
    const dateB = b.appliedAt ?? '';
    const cmp = dateB.localeCompare(dateA);
    return direction === 'asc' ? -cmp : cmp;
  });
}

export function paginateJobApplications(
  applications: JobApplicationCard[],
  options: PaginationOptions,
): { items: JobApplicationCard[]; total: number; totalPages: number; page: number } {
  const total = applications.length;
  const totalPages = Math.max(1, Math.ceil(total / options.pageSize));
  const page = Math.min(Math.max(1, options.page), totalPages);
  const start = (page - 1) * options.pageSize;
  return {
    items: applications.slice(start, start + options.pageSize),
    total,
    totalPages,
    page,
  };
}
