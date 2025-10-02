import type React from 'react'

interface FiltersSectionProps {
  filterType: string
  filterCompanion: string
  sortBy: string
  companions: string[]
  onFilterTypeChange: (type: string) => void
  onFilterCompanionChange: (companion: string) => void
  onSortByChange: (sortBy: string) => void
  onFilterChange: () => void
}

const FiltersSection: React.FC<FiltersSectionProps> = ({
  filterType,
  filterCompanion,
  sortBy,
  companions,
  onFilterTypeChange,
  onFilterCompanionChange,
  onSortByChange,
  onFilterChange,
}) => {
  return (
    <div
      className="p-4 rounded-lg border"
      style={{
        backgroundColor: 'var(--color-notion-bg)',
        borderColor: 'var(--color-notion-border)',
      }}
    >
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-notion-text)' }}>
        Filters & Sorting
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Type Filter */}
        <div>
          <label
            htmlFor="filterType"
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--color-notion-text-secondary)' }}
          >
            Type
          </label>
          <select
            id="filterType"
            value={filterType}
            onChange={(e) => onFilterTypeChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-md"
            style={{
              backgroundColor: 'var(--color-notion-bg)',
              color: 'var(--color-notion-text)',
              borderColor: 'var(--color-notion-border)',
            }}
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
        <div>
          <label
            htmlFor="filterCompanion"
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--color-notion-text-secondary)' }}
          >
            Companion
          </label>
          <select
            id="filterCompanion"
            value={filterCompanion}
            onChange={(e) => onFilterCompanionChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-md"
            style={{
              backgroundColor: 'var(--color-notion-bg)',
              color: 'var(--color-notion-text)',
              borderColor: 'var(--color-notion-border)',
            }}
          >
            <option value="">All People</option>
            {companions.map((companion) => (
              <option key={companion} value={companion}>
                {companion}
              </option>
            ))}
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label
            htmlFor="sortBy"
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--color-notion-text-secondary)' }}
          >
            Sort By
          </label>
          <select
            id="sortBy"
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-md"
            style={{
              backgroundColor: 'var(--color-notion-bg)',
              color: 'var(--color-notion-text)',
              borderColor: 'var(--color-notion-border)',
            }}
          >
            <option value="date-desc">Date (Newest First)</option>
            <option value="date-asc">Date (Oldest First)</option>
            <option value="summary">Title (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Apply Filters Button */}
      <div className="mt-4">
        <button
          onClick={onFilterChange}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-150 hover:-translate-y-px"
          style={{
            backgroundColor: 'var(--color-notion-blue)',
            color: 'white',
            border: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1a73d1'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-notion-blue)'
          }}
        >
          Apply Filters
        </button>
      </div>
    </div>
  )
}

export default FiltersSection




