import type { SessionSource } from '@hominem/chat-services/types';
import {
  ArrowUp,
  Globe,
  Copy,
  Mic,
  MoreVertical,
  Plus,
  Search,
  Share2,
  Trash2,
  X,
} from 'lucide-react';

import type { ExtendedMessage } from '../../types/chat';
import type { ChatIconName } from './chat.types';

export const mockSessionSources = {
  new: { kind: 'new' },
  thought: {
    kind: 'thought',
    preview: 'Ideas for the next onboarding pass and how to keep it concise',
  },
  note: {
    kind: 'artifact',
    id: 'note-1',
    type: 'note',
    title: 'Q3 planning follow-up',
  },
} satisfies Record<string, SessionSource>;

export const mockChatMessages: ExtendedMessage[] = [
  {
    id: 'msg-1',
    chatId: 'chat-1',
    userId: 'user-1',
    role: 'user',
    content: 'Can you summarize these notes into a short action list?',
    files: null,
    toolCalls: null,
    reasoning: null,
    parentMessageId: null,
    createdAt: '2026-03-25T15:20:00.000Z',
    updatedAt: '2026-03-25T15:20:00.000Z',
  },
  {
    id: 'msg-2',
    chatId: 'chat-1',
    userId: 'assistant-1',
    role: 'assistant',
    content: 'Absolutely.\n\n- Confirm scope\n- Draft the follow-up note\n- Send it to the team\n',
    files: null,
    toolCalls: [
      {
        toolName: 'search_notes',
        type: 'tool-call',
        toolCallId: 'tool-1',
        args: { query: 'follow-up' },
      },
    ],
    reasoning: 'I should first verify the relevant note, then turn it into a clear list.',
    parentMessageId: 'msg-1',
    createdAt: '2026-03-25T15:21:00.000Z',
    updatedAt: '2026-03-25T15:21:00.000Z',
  },
  {
    id: 'msg-3',
    chatId: 'chat-1',
    userId: 'assistant-1',
    role: 'assistant',
    content: 'Working on the final wording…',
    files: null,
    toolCalls: null,
    reasoning: null,
    parentMessageId: 'msg-2',
    createdAt: '2026-03-25T15:22:00.000Z',
    updatedAt: '2026-03-25T15:22:00.000Z',
    isStreaming: true,
  },
];

export const mockUserMessage = mockChatMessages[0];
export const mockAssistantMessage = mockChatMessages[1];
export const mockStreamingAssistantMessage = mockChatMessages[2];

export function renderChatIcon(
  name: ChatIconName,
  props: {
    color?: string;
    size: number;
    style?: object;
    useSymbol?: boolean;
  },
) {
  const iconProps = {
    color: props.color,
    size: props.size,
    style: props.style,
  };

  switch (name) {
    case 'arrows-rotate':
      return <ArrowUp {...iconProps} />;
    case 'copy':
      return <Copy {...iconProps} />;
    case 'magnifying-glass':
      return <Search {...iconProps} />;
    case 'pen-to-square':
      return <Share2 {...iconProps} />;
    case 'plus':
      return <Plus {...iconProps} />;
    case 'share-from-square':
      return <Share2 {...iconProps} />;
    case 'speaker':
      return <Mic {...iconProps} />;
    case 'stop':
      return <MoreVertical {...iconProps} />;
    case 'trash':
      return <Trash2 {...iconProps} />;
    case 'x':
      return <X {...iconProps} />;
    default:
      return <Globe {...iconProps} />;
  }
}
