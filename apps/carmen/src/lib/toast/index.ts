import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export type ToastMessage = {
  text: string
  type: string
}

export const toastSlice = createSlice({
  name: 'toast',
  initialState: {
    isOpen: false,
    messages: [],
  },
  reducers: {
    openToast(state, action: PayloadAction<ToastMessage>) {
      state.isOpen = true
      state.messages.push(action.payload)
    },
    closeToast(state) {
      state.isOpen = false
      state.messages = []
    },
  },
})

export const { openToast, closeToast } = toastSlice.actions
