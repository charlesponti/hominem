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
  onTransform,
}: ChatActionsMenuProps) {
  const router = useRouter();
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

          if (item.kind === 'transform' && item.type) {
            return (
              <Stack.Toolbar.MenuAction
                key={`${item.kind}:${item.type}`}
                icon={getConversationActionIcon(item.kind, item.type)}
                onPress={() => {
                  const transformType = item.type;
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
                      pathname: '/note-draft-sheet',
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
                {item.label}
              </Stack.Toolbar.MenuAction>
            );
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
