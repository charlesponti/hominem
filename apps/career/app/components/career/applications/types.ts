export interface ApplicationsResultsSummaryProps {
  page: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export interface ApplicationsFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  statuses: string[];
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  sourceOptions: Array<{ value: string; label: string }>;
  selectedSource: string;
  onSourceChange: (source: string) => void;
  onClearFilters: () => void;
  pagination: ApplicationsResultsSummaryProps;
}

export interface ApplicationsEmptyStateProps {
  kind: 'base' | 'filtered';
  emptyTitle: string;
  emptyDescription: string;
}
