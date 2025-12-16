export function formatChatDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()

  // Reset time to start of day for accurate comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const chatDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const diffInMs = today.getTime() - chatDate.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInDays === 0) {
    return 'Today'
  }
  if (diffInDays === 1) {
    return 'Yesterday'
  }
  if (diffInDays > 0 && diffInDays < 7) {
    return `${diffInDays} days ago`
  }
  return date.toLocaleDateString()
}
