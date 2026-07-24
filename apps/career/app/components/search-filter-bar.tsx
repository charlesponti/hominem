import { Input } from '@ponti-studios/ui/forms';
import { Button } from '@ponti-studios/ui/primitives';
import { XIcon } from 'lucide-react';
import { Children, isValidElement, type ReactNode } from 'react';

import { ActiveFiltersBar, type ActiveFilter } from './active-filters-bar';

interface SearchFilterBarSearchProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
}

function SearchFilterBarSearch({
  id,
  value,
  onChange,
  placeholder,
  ariaLabel,
}: SearchFilterBarSearchProps) {
  return (
    <div className="flex-1">
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
    </div>
  );
}

interface SearchFilterBarFiltersProps {
  children: ReactNode;
}

function SearchFilterBarFilters({ children }: SearchFilterBarFiltersProps) {
  return Children.map(children, (child) => (child ? <div className="sm:w-48">{child}</div> : null));
}

interface SearchFilterBarResultsProps {
  children: ReactNode;
}

function SearchFilterBarResults({ children }: SearchFilterBarResultsProps) {
  return <div className="self-start lg:ml-auto lg:self-auto">{children}</div>;
}

export interface SearchFilterBarProps {
  children: ReactNode;
  activeFilters: ActiveFilter[];
  onClear?: () => void;
}

export function SearchFilterBar({ children, activeFilters, onClear }: SearchFilterBarProps) {
  const slots = {
    search: null as ReactNode,
    filters: null as ReactNode,
    results: null as ReactNode,
  };
  const others: ReactNode[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === SearchFilterBarSearch) slots.search = child;
    else if (child.type === SearchFilterBarFilters) slots.filters = child;
    else if (child.type === SearchFilterBarResults) slots.results = child;
    else others.push(child);
  });

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {slots.search}
        {slots.filters}

        {hasActiveFilters && onClear ? (
          <Button type="button" variant="outline" onClick={onClear} className="min-h-0">
            <XIcon className="size-4" />
          </Button>
        ) : null}

        {slots.results}
        {others}
      </div>

      <ActiveFiltersBar filters={activeFilters} />
    </div>
  );
}

SearchFilterBar.Search = SearchFilterBarSearch;
SearchFilterBar.Filters = SearchFilterBarFilters;
SearchFilterBar.Results = SearchFilterBarResults;
