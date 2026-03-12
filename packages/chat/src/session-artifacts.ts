import type { ArtifactType, SessionSource } from './thought-types';

export interface SessionArtifactMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

export interface NoteProposal {
  proposedType: Extract<ArtifactType, 'note'>;
  proposedTitle: string;
  proposedChanges: string[];
  previewContent: string;
}

const MAX_TITLE_LENGTH = 64;
const MAX_THOUGHT_PREVIEW_LENGTH = 96;

function normalizeContent(content: string): string {
  return content.trim().replace(/\s+/g, ' ');
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

export function getThoughtPreview(messages: SessionArtifactMessage[]): string | null {
  for (const message of messages) {
    if (message.role !== 'user') {
      continue;
    }

    const preview = normalizeContent(message.content);
    if (preview.length > 0) {
      return truncate(preview, MAX_THOUGHT_PREVIEW_LENGTH);
    }
  }

  return null;
}

export function deriveSessionSource(input: {
  artifactId?: string | null;
  artifactTitle?: string | null;
  artifactType?: ArtifactType;
  messages: SessionArtifactMessage[];
}): SessionSource {
  if (input.artifactId && input.artifactTitle) {
    return {
      kind: 'artifact',
      id: input.artifactId,
      type: input.artifactType ?? 'note',
      title: input.artifactTitle,
    };
  }

  const thoughtPreview = getThoughtPreview(input.messages);
  if (thoughtPreview) {
    return {
      kind: 'thought',
      preview: thoughtPreview,
    };
  }

  return { kind: 'new' };
}

function toTranscript(messages: SessionArtifactMessage[]): string {
  return messages
    .filter((message) => normalizeContent(message.content).length > 0)
    .map((message) => {
      const label =
        message.role === 'assistant'
          ? 'Assistant'
          : message.role === 'tool'
            ? 'Tool'
            : message.role === 'system'
              ? 'System'
              : 'User';

      return `${label}: ${message.content.trim()}`;
    })
    .join('\n\n');
}

export function buildNoteProposal(messages: SessionArtifactMessage[]): NoteProposal {
  const previewContent = toTranscript(messages);
  const thoughtPreview = getThoughtPreview(messages);
  const relevantMessageCount = messages.filter(
    (message) => normalizeContent(message.content).length > 0,
  ).length;
  const includesAssistant = messages.some(
    (message) => message.role === 'assistant' && normalizeContent(message.content).length > 0,
  );
  const proposedChanges = [
    `Captured ${relevantMessageCount} message${relevantMessageCount === 1 ? '' : 's'} from this session`,
    ...(includesAssistant ? ['Includes assistant output'] : []),
  ];

  return {
    proposedType: 'note',
    proposedTitle: thoughtPreview ? truncate(thoughtPreview, MAX_TITLE_LENGTH) : 'Untitled note',
    proposedChanges,
    previewContent,
  };
}
