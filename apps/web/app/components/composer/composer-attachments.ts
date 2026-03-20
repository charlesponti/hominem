import type { UploadedFile } from '~/lib/types/upload'

export function formatUploadedFileContext(files: UploadedFile[]): string {
  if (files.length === 0) return ''

  const body = files
    .map((file) => {
      const extractedContent = (file.textContent || file.content || '').trim().slice(0, 4000)

      return [
        `Attachment: ${file.originalName}`,
        `Type: ${file.type}`,
        `MIME: ${file.mimetype}`,
        extractedContent ? `Extracted content:\n${extractedContent}` : null,
      ]
        .filter((value): value is string => Boolean(value))
        .join('\n')
    })
    .join('\n\n')

  return `Attached files context:\n${body}`
}

export function formatNoteAttachmentsSection(files: UploadedFile[]): string {
  if (files.length === 0) return ''

  const body = files
    .map((file) => {
      const details = [file.type, file.mimetype].filter(Boolean).join(', ')
      return `- [${file.originalName}](${file.url})${details ? ` - ${details}` : ''}`
    })
    .join('\n')

  return `## Attachments\n${body}`
}

export function appendNoteAttachments(content: string, files: UploadedFile[]): string {
  const trimmedContent = content.trim()
  const attachmentSection = formatNoteAttachmentsSection(files)
  if (!attachmentSection) return trimmedContent
  if (!trimmedContent) return attachmentSection
  return `${trimmedContent}\n\n${attachmentSection}`
}

export function appendChatAttachmentContext(message: string, files: UploadedFile[]): string {
  const trimmedMessage = message.trim()
  const attachmentContext = formatUploadedFileContext(files)
  if (!attachmentContext) return trimmedMessage
  if (!trimmedMessage) return attachmentContext
  return `${trimmedMessage}\n\n${attachmentContext}`
}
