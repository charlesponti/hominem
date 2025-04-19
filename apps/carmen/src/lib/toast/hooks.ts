import { type RootState, useAppDispatch, useAppSelector } from 'src/lib/store'

import { closeToast, openToast } from './index'
import type { ToastMessage } from './types'

export const useToast = () => {
  const isOpen = useAppSelector((state: RootState) => state.toast.isOpen)
  const messages = useAppSelector<ToastMessage[]>((state: RootState) => state.toast.messages)
  const dispatch = useAppDispatch()

  return {
    isOpen,
    messages,
    openToast(message: ToastMessage) {
      dispatch(openToast(message))

      // Set a timeout to close the toast automatically
      setTimeout(() => {
        dispatch(closeToast())
      }, 3000)
    },
    closeToast: () => dispatch(closeToast()),
  }
}
