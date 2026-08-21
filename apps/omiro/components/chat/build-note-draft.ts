import type { ChatMessageItem } from '@hominem/chat';
import { buildArtifactProposal } from '@hominem/chat/ui';

import t from '~/translations';

export const NOTE_TRANSCRIPT_MAX_CHARS = 20000;
const TRUNCATION_MARKER = '[Earlier messages omitted]\n\n';

type NotePreset = (typeof t.chat.noteDraft.presets)[number];

// Full sentences, not bare labels -- the backend sends this as
// `Instruction: <text>`, so "Essay" alone is a much weaker steer than a real
// directive.
export const PRESET_INSTRUCTIONS: Record<NotePreset, string> = {
  Essay: 'Write this as a flowing long-form essay with clear sections.',
  Summary: 'Write this as a short, tight summary of the key points.',
  Outline: 'Write this as a structured outline of nested bullet points.',
};

export interface NoteDraft {
  transcript: string;
  title: string;
  isTruncated: boolean;
}

// Keeps the tail of the transcript (the most recent turns) rather than the
// head, since those are the ones the user just had in front of them. Trims
// forward to the next paragraph-block boundary so a turn isn't cut
// mid-sentence -- falls back to a hard slice only if no boundary exists
// within the budget (e.g. a single message longer than the whole cap).
function truncateTranscript(transcript: string): string {
  const budget = NOTE_TRANSCRIPT_MAX_CHARS - TRUNCATION_MARKER.length;
  const tail = transcript.slice(-budget);
  const boundary = tail.indexOf('\n\n');
  const trimmed = boundary === -1 ? tail : tail.slice(boundary + 2);
  return TRUNCATION_MARKER + (trimmed.trim().length > 0 ? trimmed : tail);
}

export function buildNoteDraft(messages: ChatMessageItem[]): NoteDraft {
  const proposalMessages = messages.map((message) => ({
    role: message.role,
    content: message.message,
  }));
  const proposal = buildArtifactProposal(proposalMessages, 'note');
  const isTruncated = proposal.previewContent.length > NOTE_TRANSCRIPT_MAX_CHARS;

  return {
    transcript: isTruncated
      ? truncateTranscript(proposal.previewContent)
      : proposal.previewContent,
    title: proposal.proposedTitle,
    isTruncated,
  };
}
