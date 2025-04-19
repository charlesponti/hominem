import styled from '@emotion/styled'
import { X } from 'lucide-react'
import { type KeyboardEvent, type PropsWithChildren, useCallback, useEffect, useRef } from 'react'

const StyledDialog = styled.dialog`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  overflow: hidden;
  transition: background-color 0.2s ease-in-out;

  @media screen and (max-width: 400px) {
    margin: 0;
  }
`

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
    <StyledDialog
      className={`modal z-40 ${isOpen ? 'modal-open' : ''}`}
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
    </StyledDialog>
  )
}

export default Modal
