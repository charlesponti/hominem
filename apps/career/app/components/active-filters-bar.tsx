import { FilterChip } from '@ponti-studios/ui/data-display';

export interface ActiveFilter {
  id: string;
  label: string;
  onRemove: () => void;
  onClick?: () => void;
}

export interface ActiveFiltersBarProps {
  filters: ActiveFilter[];
  label?: string;
}

export function ActiveFiltersBar({ filters, label }: ActiveFiltersBarProps) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {label ? <span className="text-muted-foreground text-sm">{label}</span> : null}
      {filters.map((filter) => (
        <FilterChip
          key={filter.id}
          label={filter.label}
          className="rounded"
          onRemove={filter.onRemove}
          onClick={filter.onClick}
        />
      ))}
    </div>
  );
}
