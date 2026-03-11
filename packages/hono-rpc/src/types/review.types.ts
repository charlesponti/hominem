// ============================================================================
// REVIEW — accept / reject pending ReviewItems
// ============================================================================

export type ReviewAcceptInput = {
  finalTitle?: string
}

export type ReviewAcceptOutput = {
  noteId: string
}

export type ReviewRejectOutput = {
  success: boolean
}
