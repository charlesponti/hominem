import type { ChatMessageItem } from '@hominem/chat-services';
import type React from 'react';

export type ChatIconName =
  | 'arrows-rotate'
  | 'copy'
  | 'magnifying-glass'
  | 'pen-to-square'
  | 'plus'
  | 'share-from-square'
  | 'speaker'
  | 'stop'
  | 'trash'
  | 'x';

export type ChatRenderIcon = (
  name: ChatIconName,
  props: {
    color?: string;
    size: number;
    style?: object;
    useSymbol?: boolean;
  },
) => React.ReactNode;

export type MarkdownComponent = React.ComponentType<{
  children: React.ReactNode;
  style?: object;
}>;

export type { ChatMessageItem };
