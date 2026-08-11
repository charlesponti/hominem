import { humanizeIdentifier } from '@hominem/utils/text';
import { ActiveFiltersBar } from '@ponti-studios/ui/filters';
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ponti-studios/ui/forms';
import { PaginationControls } from '@ponti-studios/ui/navigation';
import { Button } from '@ponti-studios/ui/primitives';
import { ArrowDownIcon, ArrowUpIcon, SearchIcon } from 'lucide-react';

import { JobApplicationStatusSelect } from './JobApplicationStatusSelect';
import type { ApplicationsFiltersProps } from './types';

export function ApplicationsFilters({
  statusOptions,
  searchValue,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  sourceOptions,
  selectedSource,
  onSourceChange,
  onClearFilters,
  sort,
  onSortChange,
  pagination,
}: ApplicationsFiltersProps) {
  const selectedStatusLabel = humanizeIdentifier(selectedStatus);
  const selectedSourceLabel =
    sourceOptions.find((option) => option.value === selectedSource)?.label ?? selectedSource;
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
    ...(selectedSource
      ? [
          {
            id: 'source',
            label: `Source: ${selectedSourceLabel}`,
            onRemove: () => onSourceChange(''),
          },
        ]
      : []),
  ];

  return (
    <section aria-label="Search applications" className="border-border border-b pb-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1 flex">
          <div className="flex items-center gap-2 px-2 rounded-l-md border">
            <SearchIcon className="text-muted-foreground pointer-events-none size-4" aria-hidden />
          </div>
          <Input
            id="application-search"
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by position or company..."
            aria-label="Search applications"
            className="rounded-l-none border-l-0 max-h-8"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <JobApplicationStatusSelect
            options={statusOptions}
            value={selectedStatus}
            onValueChange={onStatusChange}
          />

          <Select value={selectedSource} onValueChange={onSourceChange}>
            <SelectTrigger id="application-source-filter" size="sm" aria-label="Filter by source">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All sources</SelectItem>
              {sourceOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button type="button" variant="ghost" size="sm" onClick={onSortChange}>
            {sort === 'desc' ? <ArrowDownIcon /> : <ArrowUpIcon />}
            {sort === 'desc' ? 'Newest first' : 'Oldest first'}
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <ActiveFiltersBar
          filters={activeFilters}
          onClearAll={onClearFilters}
          className="min-w-0 flex-1"
        />

        {pagination.totalPages > 1 ? (
          <div className="*:h-10">
            <PaginationControls
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={pagination.onPageChange}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
