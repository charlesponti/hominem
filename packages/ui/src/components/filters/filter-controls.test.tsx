import { describe, expect, test } from 'vitest'
import { render, screen } from '../../test-utils'
import type { ActiveFilter } from './active-filters-bar'
import { FilterControls } from './filter-controls'

describe('FilterControls', () => {
  test('renders children', () => {
    render(
      <FilterControls>
        <div>Test Content</div>
      </FilterControls>
    )

    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  test('displays active filters when showActiveFilters is true', () => {
    const filters: ActiveFilter[] = [{ id: '1', label: 'Filter 1', onRemove: () => {} }]

    render(
      <FilterControls showActiveFilters={true} activeFilters={filters}>
        <div>Test Content</div>
      </FilterControls>
    )

    expect(screen.getByText('Filter 1')).toBeInTheDocument()
  })

  test('does not display active filters when showActiveFilters is false', () => {
    const filters: ActiveFilter[] = [{ id: '1', label: 'Filter 1', onRemove: () => {} }]

    render(
      <FilterControls showActiveFilters={false} activeFilters={filters}>
        <div>Test Content</div>
      </FilterControls>
    )

    expect(screen.queryByText('Filter 1')).not.toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <FilterControls className="custom-class">
        <div>Test Content</div>
      </FilterControls>
    )

    const wrapper = container.querySelector('.custom-class')
    expect(wrapper).toBeInTheDocument()
  })

  test('renders multiple children', () => {
    render(
      <FilterControls>
        <div>Child 1</div>
        <div>Child 2</div>
        <div>Child 3</div>
      </FilterControls>
    )

    expect(screen.getByText('Child 1')).toBeInTheDocument()
    expect(screen.getByText('Child 2')).toBeInTheDocument()
    expect(screen.getByText('Child 3')).toBeInTheDocument()
  })
})
