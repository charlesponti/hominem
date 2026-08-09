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
};

export type PaginationOptions = {
  limit?: number;
};

export function filterJobApplications(
  applications: JobApplicationCard[],
  filter?: JobApplicationFilter,
): JobApplicationCard[] {
  if (!filter?.status) return applications;
  return applications.filter((a) => a.status === filter.status);
}

export function sortAndPaginateJobApplications(
  applications: JobApplicationCard[],
  options?: PaginationOptions,
): JobApplicationCard[] {
  const sorted = [...applications].sort((a, b) => {
    const dateA = a.appliedAt ?? '';
    const dateB = b.appliedAt ?? '';
    return dateB.localeCompare(dateA);
  });

  if (options?.limit && options.limit > 0) {
    return sorted.slice(0, options.limit);
  }
  return sorted;
}
