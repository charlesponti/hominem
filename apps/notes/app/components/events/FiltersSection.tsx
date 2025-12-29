import type React from 'react'
import { useId } from 'react'

interface FiltersSectionProps {
  filterType: string
  filterCompanion: string
  filterSource: string
  sortBy: string
  companions: string[]
  onFilterTypeChange: (type: string) => void
  onFilterCompanionChange: (companion: string) => void
  onFilterSourceChange: (source: string) => void
  onSortByChange: (sortBy: string) => void
  onFilterChange: () => void
}

const FiltersSection: React.FC<FiltersSectionProps> = ({
  filterType,
  filterCompanion,
  filterSource,
  sortBy,
  companions,
  onFilterTypeChange,
  onFilterCompanionChange,
  onFilterSourceChange,
  onSortByChange,
  onFilterChange,
}) => {
  const filterTypeId = useId()
  const filterCompanionId = useId()
  const filterSourceId = useId()
  const sortById = useId()
  return (
    <div className="flex items-end gap-3 flex-1">
      {/* Type Filter */}
      <div className="flex-1">
        <label
          htmlFor={filterTypeId}
          className="block text-xs font-medium mb-1.5 uppercase tracking-wide text-muted-foreground"
        >
          Type
        </label>
        <select
          id={filterTypeId}
          value={filterType}
          onChange={(e) => onFilterTypeChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded-lg transition-colors bg-muted text-foreground border-border"
        >
          <option value="">All Types</option>
          <option value="Events">Events</option>
          <option value="Movies">Movies</option>
          <option value="Reading">Reading</option>
          <option value="Dates">Dates</option>
          <option value="Birthdays">Birthdays</option>
          <option value="Anniversaries">Anniversaries</option>
        </select>
      </div>

      {/* Companion Filter */}
      <div className="flex-1">
        <label
          htmlFor={filterCompanionId}
          className="block text-xs font-medium mb-1.5 uppercase tracking-wide text-muted-foreground"
        >
          Companion
        </label>
        <select
          id={filterCompanionId}
          value={filterCompanion}
          onChange={(e) => onFilterCompanionChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded-lg transition-colors bg-muted text-foreground border-border"
        >
          <option value="">All People</option>
          {companions.map((companion) => (
            <option key={companion} value={companion}>
              {companion}
            </option>
          ))}
        </select>
      </div>

      {/* Source Filter */}
      <div className="flex-1">
        <label
          htmlFor={filterSourceId}
          className="block text-xs font-medium mb-1.5 uppercase tracking-wide text-muted-foreground"
        >
          Source
        </label>
        <select
          id={filterSourceId}
          value={filterSource}
          onChange={(e) => onFilterSourceChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded-lg transition-colors bg-muted text-foreground border-border"
        >
          <option value="">All Sources</option>
          <option value="manual">Manual</option>
          <option value="google_calendar">Google Calendar</option>
        </select>
      </div>

      {/* Sort By */}
      <div className="flex-1">
        <label
          htmlFor={sortById}
          className="block text-xs font-medium mb-1.5 uppercase tracking-wide text-muted-foreground"
        >
          Sort By
        </label>
        <select
          id={sortById}
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded-lg transition-colors bg-muted text-foreground border-border"
        >
          <option value="date-desc">Date (Newest First)</option>
          <option value="date-asc">Date (Oldest First)</option>
          <option value="summary">Title (A-Z)</option>
        </select>
      </div>

      {/* Apply Filters Button */}
      <button
        type="button"
        onClick={onFilterChange}
        className="inline-flex items-center justify-center px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-150 whitespace-nowrap bg-primary text-primary-foreground hover:opacity-90"
      >
        Apply
      </button>
    </div>
  )
}

export default FiltersSection
