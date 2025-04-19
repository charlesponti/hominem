import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import * as reactRouterDom from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { MockedFunction } from 'vitest'

import { baseURL } from 'src/lib/api/base'
import { testServer } from 'src/test/test.setup'
import { getMockPlace, renderWithProviders } from 'src/test/utils'

import userEvent from '@testing-library/user-event'
import PlaceItem from './index'

describe('PlaceItem', () => {
  let navigate: MockedFunction<typeof reactRouterDom.useNavigate>
  const place = getMockPlace()

  beforeEach(() => {
    navigate = vi.fn()
    vi.spyOn(reactRouterDom, 'useNavigate').mockReturnValue(navigate)
  })

  test('should render place', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <PlaceItem place={place} onDelete={() => void 0} onError={() => void 0} listId="123" />
    )

    expect(screen.queryByText('Place Name')).toBeInTheDocument()

    // Navigate to place
    await user.click(screen.getByTestId('place-item'))
    expect(navigate).toHaveBeenCalledWith(`/places/${place.googleMapsId}`)
  })

  test('should delete place', async () => {
    const user = userEvent.setup()
    testServer.use(
      http.delete(`${baseURL}/lists/123/items/123`, () => new HttpResponse(null, { status: 204 }))
    )
    const onDelete = vi.fn()
    renderWithProviders(
      <PlaceItem place={place} onDelete={onDelete} onError={() => void 0} listId="123" />
    )

    // Open dropdown menu
    await user.click(screen.getByTestId('place-dropdownmenu-trigger'))

    // Wait for dropdown menu to render
    await waitFor(() => {
      expect(screen.queryByTestId('place-delete-button')).toBeInTheDocument()
    })

    // Open delete modal
    await user.click(screen.getByTestId('place-delete-button'))

    // Wait for delete modal to render
    await waitFor(() => {
      expect(screen.queryByTestId('place-delete-modal')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('place-delete-confirm-button'))

    await waitFor(async () => {
      expect(screen.queryByTestId('place-delete-modal')).not.toBeInTheDocument()
      expect(onDelete).toHaveBeenCalled()
    })
  })
})
