import { AttachmentsPreview } from './AttachmentsPreview.js'
import { SearchContextPreview } from './SearchContextPreview.js'
import type { ChatFileAttachment } from '~/lib/types/chat.js'

interface ChatAttachmentsProps {
  attachedFiles: ChatFileAttachment[]
  searchContext: string
  onRemoveFile: (fileId: string) => void
  onRemoveAllFiles: () => void
  onRemoveSearchContext: () => void
}

export function ChatAttachments({
  attachedFiles,
  searchContext,
  onRemoveFile,
  onRemoveAllFiles,
  onRemoveSearchContext,
}: ChatAttachmentsProps) {
  return (
    <>
      {/* Attachments Preview */}
      {attachedFiles.length > 0 && (
        <AttachmentsPreview
          files={attachedFiles}
          onRemoveFile={onRemoveFile}
          onRemoveAll={onRemoveAllFiles}
        />
      )}

      {/* Search Context Preview */}
      {searchContext && (
        <SearchContextPreview searchContext={searchContext} onRemove={onRemoveSearchContext} />
      )}
    </>
  )
}
