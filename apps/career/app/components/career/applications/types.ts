import type { ReactNode } from 'react';

export interface ApplicationsFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusOptions: Array<{ value: string; label: string }>;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  sourceOptions: Array<{ value: string; label: string }>;
  selectedSource: string;
  onSourceChange: (source: string) => void;
  onClearFilters: () => void;
  sortChip?: ReactNode;
  pagination: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}
