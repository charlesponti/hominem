import { X } from 'lucide-react'
import { type KeyboardEvent, type PropsWithChildren, useCallback, useEffect, useRef } from 'react'
import styles from './modal.module.css'

type ModalProps = PropsWithChildren<{
  isOpen: boolean
  onModalClose: (_?: unknown) => void
}>

function Modal({ children, isOpen, onModalClose, ...props }: ModalProps) {
  const ref = useRef<SVGSVGElement>(null)
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDialogElement>) => {
      if (event.code === 'Escape') {
        onModalClose(event)
      }
    },
    [onModalClose]
  )

  useEffect(() => {
    /**
     * Focus the close button when the modal is opened to enable users to
     * traverse the modal with the keyboard
     */
    if (isOpen) {
      ref.current?.focus()
    }
  }, [isOpen])

  return (
    <dialog
      open={isOpen}
      className={`modal z-40 ${isOpen ? `modal-open ${styles.dialog}` : ''}`}
      onKeyDown={handleKeyDown}
      {...props}
    >
      <form method="dialog" className="modal-box">
        <button
          type="button"
          data-testid="modal-close-button"
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={onModalClose}
        >
          <X size={24} ref={ref} tabIndex={0} />
        </button>
        <div className="mt-6">{children}</div>
      </form>
    </dialog>
  )
}

export default Modal
