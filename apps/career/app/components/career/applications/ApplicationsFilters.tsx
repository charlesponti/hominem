import { replaceUnderscores } from '@hominem/utils/text';
import { Input } from '@ponti-studios/ui/forms';
import { PaginationControls } from '@ponti-studios/ui/navigation';

import { FilterSelect, SearchFilterBar } from '~/components/patterns';

import type { ApplicationsFiltersProps } from './types';

export function ApplicationsFilters({
  searchValue,
  onSearchChange,
  statuses,
  selectedStatus,
  onStatusChange,
  sourceOptions,
  selectedSource,
  onSourceChange,
  onClearFilters,
  pagination,
}: ApplicationsFiltersProps) {
  const statusOptions = statuses.map((status) => ({
    value: status,
    label: replaceUnderscores(status),
  }));

  const activeFilters = [
    ...(searchValue
      ? [
          {
            id: 'search',
            label: `Search: ${searchValue}`,
            onRemove: () => onSearchChange(''),
          },
        ]
      : []),
    ...(selectedStatus
      ? [
          {
            id: 'status',
            label: replaceUnderscores(selectedStatus),
            onRemove: () => onStatusChange(''),
          },
        ]
      : []),
    ...(selectedSource
      ? [
          {
            id: 'source',
            label: `Source: ${selectedSource}`,
            onRemove: () => onSourceChange(''),
          },
        ]
      : []),
  ];

  return (
    <SearchFilterBar
      activeFilters={activeFilters}
      onClearAll={onClearFilters}
      search={
        <Input
          id="application-search"
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by position or company..."
          aria-label="Search applications"
        />
      }
      filters={[
        <FilterSelect
          key="status"
          label="Status"
          value={selectedStatus}
          options={statusOptions}
          onChange={onStatusChange}
          placeholder="All statuses"
          id="application-status-filter"
        />,
        <FilterSelect
          key="source"
          label="Source"
          value={selectedSource}
          options={sourceOptions}
          onChange={onSourceChange}
          placeholder="All sources"
          id="application-source-filter"
        />,
      ]}
      results={
        <PaginationControls
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={pagination.onPageChange}
        />
      }
    />
  );
}
