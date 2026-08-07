import type { ArtifactType } from '@hominem/rpc/types';

import t from '~/translations';

export type ConversationActionType = ArtifactType;

export type ConversationActionKind =
  | 'search'
  | 'toggle-debug'
  | 'settings'
  | 'transform'
  | 'archive';

export interface ConversationActionItem {
  kind: ConversationActionKind;
  label: string;
  type?: Exclude<ConversationActionType, 'tracker'>;
}

export interface ConversationActionSection {
  title: string;
  items: ConversationActionItem[];
}

export interface ConversationActionsModelInput {
  canTransform: boolean;
  isArchiving: boolean;
  showDebug: boolean;
}

const TRANSFORM_ITEMS: { type: Exclude<ConversationActionType, 'tracker'>; label: string }[] = [
  { type: 'note', label: t.chat.actions.transformToNote },
  { type: 'task_list', label: t.chat.actions.createTasks },
];

export function buildConversationActionsModel(
  input: ConversationActionsModelInput,
): ConversationActionSection[] {
  const sections: ConversationActionSection[] = [
    {
      title: t.chat.actions.sectionConversation,
      items: [
        { kind: 'search', label: t.chat.actions.searchMessages },
        {
          kind: 'toggle-debug',
          label: input.showDebug
            ? t.chat.actions.hideDebugMetadata
            : t.chat.actions.showDebugMetadata,
        },
        { kind: 'settings', label: t.chat.actions.chatSettings },
      ],
    },
  ];

  if (input.canTransform) {
    sections.push({
      title: t.chat.actions.sectionTransform,
      items: TRANSFORM_ITEMS.map(({ type, label }) => ({
        kind: 'transform',
        label,
        type,
      })),
    });
  }

  sections.push({
    title: t.chat.actions.sectionDanger,
    items: [
      {
        kind: 'archive',
        label: input.isArchiving ? t.chat.actions.archiving : t.chat.actions.archiveChat,
      },
    ],
  });

  return sections;
}
