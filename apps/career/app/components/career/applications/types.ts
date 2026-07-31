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
  pagination: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

export interface ApplicationsEmptyStateProps {
  kind: 'base' | 'filtered';
  emptyTitle: string;
  emptyDescription: string;
}
