import { fireEvent, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { type Mock, beforeEach, describe, expect, test, vi } from 'vitest'

import api from 'src/lib/api'
import type { List } from 'src/lib/types'
import { testServer } from 'src/test/test.setup'
import { renderWithProviders } from 'src/test/utils'

import { baseURL } from 'src/lib/api/base'
import ListEditSheet from './list-edit-sheet'
import * as listMenu from './list-menu'

function mockUseListMenu({ isEditSheetOpen = true, isDeleteSheetOpen = false } = {}) {
  vi.spyOn(listMenu, 'useListMenu').mockReturnValue({
    isEditSheetOpen,
    setIsEditSheetOpen: vi.fn(),
    isDeleteSheetOpen,
    setIsDeleteSheetOpen: vi.fn(),
  })
}

const URL = `${baseURL}/lists/1`

describe('ListEditSheet', () => {
  const mockList: List = {
    id: '1',
    name: 'Test List',
    description: 'Test Description',
    // Add other required fields from List type as needed
  } as Partial<List>

  beforeEach(() => {
    mockUseListMenu({ isEditSheetOpen: true })
  })

  test('updates the list on save', async () => {
    vi.spyOn(api, 'put')
    testServer.resetHandlers(http.put(URL, () => HttpResponse.json({})))
    renderWithProviders(<ListEditSheet list={mockList} />)

    const nameInput = screen.getByLabelText('Name')
    const descriptionInput = screen.getByLabelText('Description')
    const listEditForm = screen.getByTestId('list-edit-form')

    fireEvent.change(nameInput, { target: { value: 'New List Name' } })
    fireEvent.change(descriptionInput, {
      target: { value: 'New List Description' },
    })
    fireEvent.submit(listEditForm)

    await waitFor(() => {
      expect(api.put as Mock).toHaveBeenCalledWith('/lists/1', {
        name: 'New List Name',
        description: 'New List Description',
      })
    })
  })

  test.skip('should display the error message', async () => {
    const message = 'Error message'
    testServer.resetHandlers(http.put(URL, () => HttpResponse.json({ message }, { status: 500 })))

    renderWithProviders(<ListEditSheet list={mockList} />)

    const listEditForm = screen.getByTestId('list-edit-form')
    fireEvent.submit(listEditForm)

    await waitFor(() => {
      expect(
        screen.getByText('There was an issue editing your list. Try again later.')
      ).toBeInTheDocument()
    })
  })
})
