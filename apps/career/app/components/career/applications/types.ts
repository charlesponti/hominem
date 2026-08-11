import type { SortDirection } from '~/lib/career/queries/job-applications';
import type { FilterOption } from '~/lib/career/queries/job-applications';

export interface ApplicationsFiltersProps {
  statusOptions: FilterOption[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  onClearFilters: () => void;
  sort: SortDirection;
  onSortChange: () => void;
  pagination: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}
