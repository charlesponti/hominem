import { humanizeIdentifier } from '@hominem/utils/text';
import { ActiveFiltersBar } from '@ponti-studios/ui/filters';
import { PaginationControls } from '@ponti-studios/ui/navigation';
import { Button } from '@ponti-studios/ui/primitives';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';

import { ExpandableSearch } from '~/components/career/ExpandableSearch';

import { JobApplicationStatusSelect } from './JobApplicationStatusSelect';
import type { ApplicationsFiltersProps } from './types';

export function ApplicationsFilters({
  statusOptions,
  searchValue,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  onClearFilters,
  sort,
  onSortChange,
  pagination,
}: ApplicationsFiltersProps) {
  const selectedStatusLabel = humanizeIdentifier(selectedStatus);
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
            label: `Status: ${selectedStatusLabel}`,
            onRemove: () => onStatusChange(''),
          },
        ]
      : []),
  ];

  return (
    <section aria-label="Search applications" className="border-border border-b pb-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <ExpandableSearch
          id="application-search"
          value={searchValue}
          onChange={onSearchChange}
          placeholder="Search by position or company..."
          ariaLabel="Search applications"
        />

        <JobApplicationStatusSelect
          options={statusOptions}
          value={selectedStatus}
          onValueChange={onStatusChange}
        />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onSortChange}
          className="border border-border bg-card"
        >
          <span key={sort} className="animate-sort-direction" aria-hidden>
            {sort === 'desc' ? <ArrowDownIcon /> : <ArrowUpIcon />}
          </span>
          <span key={`sort-label-${sort}`} className="animate-sort-label">
            {sort === 'desc' ? 'Newest first' : 'Oldest first'}
          </span>
        </Button>

        {pagination.totalPages > 1 ? (
          <div className="*:h-8">
            <PaginationControls
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={pagination.onPageChange}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <ActiveFiltersBar
          filters={activeFilters}
          onClearAll={onClearFilters}
          className="min-w-0 flex-1"
        />
      </div>
    </section>
  );
}
