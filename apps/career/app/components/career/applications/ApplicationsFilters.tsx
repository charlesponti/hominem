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
import { SearchIcon } from 'lucide-react';

import type { ApplicationsFiltersProps } from './types';

export function ApplicationsFilters({
  searchValue,
  onSearchChange,
  statusOptions,
  selectedStatus,
  onStatusChange,
  sourceOptions,
  selectedSource,
  onSourceChange,
  onClearFilters,
  sortChip,
  pagination,
}: ApplicationsFiltersProps) {
  const selectedStatusLabel =
    statusOptions.find((option) => option.value === selectedStatus)?.label ?? selectedStatus;
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
          <Select value={selectedStatus} onValueChange={onStatusChange}>
            <SelectTrigger id="application-status-filter" size="sm" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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

          {sortChip}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <ActiveFiltersBar
          filters={activeFilters}
          onClearAll={onClearFilters}
          className="min-w-0 flex-1"
        />

        {pagination.totalPages > 1 ? (
          <div className="ml-auto">
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
