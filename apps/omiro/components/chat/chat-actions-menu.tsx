import type { ChatMessageItem } from '@hominem/chat';
import type { ArtifactType } from '@hominem/rpc/types';
import { Stack, useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { buildNoteDraft } from '~/components/chat/build-note-draft';
import { buildConversationActionsModel } from '~/components/chat/conversation-actions.model';
import { useChatArchiveAction } from '~/hooks/use-chat-archive-action';
import t from '~/translations';

function getConversationActionIcon(kind: string, type?: string) {
  if (kind === 'search') return 'magnifyingglass';
  if (kind === 'toggle-debug') return 'ladybug';
  if (kind === 'settings') return 'slider.horizontal.3';
  if (kind === 'sources') return 'doc.text.magnifyingglass';
  if (kind === 'archive') return 'archivebox';
  if (type === 'note') return 'doc.text';
  if (type === 'task') return 'checkmark.circle';
  if (type === 'task_list') return 'checklist';
  return 'ellipsis.circle';
}

interface ChatActionsMenuProps {
  chatId: string;
  messages: ChatMessageItem[];
  isConversationGone: boolean;
  canTransform: boolean;
  showDebug: boolean;
  onChatArchive: () => void;
  onOpenSearch: () => void;
  onToggleDebug: () => void;
  onOpenSettings: () => void;
  onOpenSources: () => void;
  onTransform: (type: ArtifactType) => void;
}

export function ChatActionsMenu({
  chatId,
  messages,
  isConversationGone,
  canTransform,
  showDebug,
  onChatArchive,
  onOpenSearch,
  onToggleDebug,
  onOpenSettings,
  onOpenSources,
  onTransform,
}: ChatActionsMenuProps) {
  const { handleArchiveChat, isArchiving } = useChatArchiveAction({ chatId, onChatArchive });
  const conversationActions = buildConversationActionsModel({
    canTransform,
    isArchiving,
    showDebug,
  });

  return (
    <Stack.Toolbar.Menu accessibilityLabel={t.chat.conversationActionsLabel} icon="ellipsis.circle">
      {(isConversationGone ? [] : conversationActions).map((section) =>
        section.items.map((item) => {
          if (item.kind === 'search') {
            return (
              <Stack.Toolbar.MenuAction
                key={item.kind}
                icon={getConversationActionIcon(item.kind)}
                onPress={onOpenSearch}
              >
                {item.label}
              </Stack.Toolbar.MenuAction>
            );
          }

          if (item.kind === 'toggle-debug') {
            return (
              <Stack.Toolbar.MenuAction
                key={item.kind}
                icon={getConversationActionIcon(item.kind)}
                isOn={showDebug}
                onPress={onToggleDebug}
              >
                {item.label}
              </Stack.Toolbar.MenuAction>
            );
          }

          if (item.kind === 'settings') {
            return (
              <Stack.Toolbar.MenuAction
                key={item.kind}
                icon={getConversationActionIcon(item.kind)}
                onPress={onOpenSettings}
              >
                {item.label}
              </Stack.Toolbar.MenuAction>
            );
          }

          if (item.kind === 'sources') {
            return (
              <Stack.Toolbar.MenuAction
                key={item.kind}
                icon={getConversationActionIcon(item.kind)}
                onPress={onOpenSources}
              >
                {item.label}
              </Stack.Toolbar.MenuAction>
            );
          }

          if (item.kind === 'transform' && item.type) {
            return TransformMenuAction({
              chatId,
              kind: item.kind,
              type: item.type,
              label: item.label,
              messages,
              onTransform,
            });
          }

          return (
            <Stack.Toolbar.MenuAction
              key={item.kind}
              icon={getConversationActionIcon(item.kind)}
              onPress={handleArchiveChat}
            >
              {item.label}
            </Stack.Toolbar.MenuAction>
          );
        }),
      )}
    </Stack.Toolbar.Menu>
  );
}

function TransformMenuAction({
  chatId,
  kind,
  type,
  label,
  messages,
  onTransform,
}: {
  chatId: string;
  type: ArtifactType;
  label: string;
  kind: 'transform';
  messages: ChatMessageItem[];
  onTransform: (type: ArtifactType) => void;
}) {
  const router = useRouter();

  return (
    <Stack.Toolbar.MenuAction
      key={`${kind}:${type}`}
      icon={getConversationActionIcon(kind, type)}
      onPress={() => {
        const transformType = type;
        if (!transformType) {
          return;
        }

        if (transformType === 'note') {
          const draft = buildNoteDraft(messages);
          if (draft.transcript.trim().length === 0) {
            Alert.alert(t.chat.noteDraft.emptyChat);
            return;
          }

          router.push({
            pathname: '/chat-to-note-sheet',
            params: {
              transcript: draft.transcript,
              title: draft.title,
              isTruncated: draft.isTruncated.toString(),
              chatId,
            },
          });
          return;
        }

        onTransform(transformType);
      }}
    >
      {label}
    </Stack.Toolbar.MenuAction>
  );
}
