import { screen } from '@testing-library/svelte'
import { renderWithStores } from '../../test/utils'
import { describe, expect, test } from 'vitest'
import PlaceTypes from './PlaceTypes.svelte'

describe('PlaceTypes', () => {
  test('should render types', () => {
    renderWithStores(PlaceTypes, { props: { types: ['clothing', 'boutique'] } })
    expect(screen.getByText('clothing')).toBeInTheDocument()
    expect(screen.getByText('boutique')).toBeInTheDocument()
  })

  test('should only render types within limit', () => {
    renderWithStores(PlaceTypes, {
      props: {
        limit: 1,
        types: ['cafe', 'restaurant'],
      },
    })
    expect(screen.getByText('cafe')).toBeInTheDocument()
    expect(screen.queryByText('restaurant')).not.toBeInTheDocument()
  })

  test('should not render store for multi-types', () => {
    renderWithStores(PlaceTypes, { props: { types: ['store', 'restaurant'] } })
    expect(screen.queryByText('store')).not.toBeInTheDocument()
    expect(screen.getByText('restaurant')).toBeInTheDocument()
  })
})
