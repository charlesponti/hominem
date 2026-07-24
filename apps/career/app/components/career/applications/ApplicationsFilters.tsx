import { replaceUnderscores } from '@hominem/utils/text';

import { FilterSelect, SearchFilterBar } from '~/components/patterns';

import { ApplicationsResultsSummary } from './ApplicationsResultsSummary';
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
    <SearchFilterBar activeFilters={activeFilters} onClear={onClearFilters}>
      <SearchFilterBar.Search
        id="application-search"
        value={searchValue}
        onChange={onSearchChange}
        placeholder="Search by position or company..."
        ariaLabel="Search applications"
      />
      <SearchFilterBar.Filters>
        <FilterSelect
          value={selectedStatus}
          options={statusOptions}
          onChange={onStatusChange}
          placeholder="All statuses"
          id="application-status-filter"
        />
        <FilterSelect
          value={selectedSource}
          options={sourceOptions}
          onChange={onSourceChange}
          placeholder="All sources"
          id="application-source-filter"
        />
      </SearchFilterBar.Filters>
      <SearchFilterBar.Results>
        <ApplicationsResultsSummary {...pagination} />
      </SearchFilterBar.Results>
    </SearchFilterBar>
  );
}
