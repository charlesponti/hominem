import type { ChatMessageDto } from '@hominem/rpc/types/chat.types';
import { useCallback, useEffect, useState } from 'react';
import { data } from 'react-router';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '~/components/ai-elements/conversation';
import { Message, MessageContent } from '~/components/ai-elements/message';
import { preloadPersona } from '~/components/ai-elements/persona';
import { Shimmer } from '~/components/ai-elements/shimmer';
import { ChatComposer } from '~/components/chat/chat-composer';
import { ChatMessage as ChatMessageView } from '~/components/chat/chat-message';
import { serverEnv } from '~/lib/env.server';
import { useChatComposerState } from '~/lib/hooks/use-chat-composer-state';
import { useChatDisplayMessages } from '~/lib/hooks/use-chat-display-messages';
import { useChatMessages } from '~/lib/hooks/use-chat-messages';
import { useSpeechToText } from '~/lib/hooks/use-speech-to-text';
import { useStreamMessage } from '~/lib/hooks/use-stream-message';
import { useToolCallRespond } from '~/lib/hooks/use-tool-call-respond';

import type { Route } from './+types/chat.$chatId';

type ChatMessageLoaderData = ChatMessageDto[];

type NoteLoaderData = {
  id: string;
  title?: string | null;
  excerpt?: string | null;
};

function getSpeechUrl(chatId: string, messageId: string) {
  return `${import.meta.env.VITE_PUBLIC_API_URL}/api/chats/${chatId}/messages/${messageId}/speech`;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const cookie = request.headers.get('cookie');
  const headers = cookie ? { cookie } : undefined;

  const messagesResponse = await fetch(
    new URL(
      `/api/chats/${params.chatId}/messages?limit=50`,
      serverEnv.HOMINEM_INTERNAL_API_URL,
    ).toString(),
    { headers },
  );
  const messages = messagesResponse.ok
    ? ((await messagesResponse.json()) as ChatMessageLoaderData)
    : [];

  const noteId = new URL(request.url).searchParams.get('noteId');
  let seedNote: NoteLoaderData | null = null;
  if (noteId) {
    const noteResponse = await fetch(
      new URL(`/api/notes/${noteId}`, serverEnv.HOMINEM_INTERNAL_API_URL).toString(),
      { headers },
    );
    seedNote = noteResponse.ok ? ((await noteResponse.json()) as NoteLoaderData) : null;
  }

  return data({ seedNote, messages });
}

export default function ChatPage({
  loaderData,
  params,
}: {
  loaderData: {
    seedNote: NoteLoaderData | null;
    messages: ChatMessageLoaderData;
  };
  params: { chatId: string };
}) {
  const { seedNote, messages: initialMessages } = loaderData;
  const { chatId } = params;
  const [activeSpeechMessageId, setActiveSpeechMessageId] = useState<string | null>(null);

  const activateSpeech = useCallback((messageId: string) => {
    setActiveSpeechMessageId(messageId);
  }, []);

  const deactivateSpeech = useCallback((messageId: string) => {
    setActiveSpeechMessageId((activeMessageId) =>
      activeMessageId === messageId ? null : activeMessageId,
    );
  }, []);

  useEffect(() => {
    preloadPersona();
  }, []);

  const { messages } = useChatMessages({ chatId, initialData: initialMessages });
  const streamMessage = useStreamMessage({ chatId });
  const toolCallRespond = useToolCallRespond({ chatId });
  const composer = useChatComposerState({ seedNote });
  const speech = useSpeechToText({ onTranscript: composer.setDraft });
  const display = useChatDisplayMessages({ messages });

  async function handleSend() {
    if (
      composer.draftWithSeed.trim().length === 0 &&
      composer.attachedFiles.length === 0 &&
      composer.selectedNotesForSend.length === 0
    ) {
      return;
    }
    if (speech.isListening) {
      speech.stop();
    }

    const messageToSend = composer.draftWithSeed;
    const filesToSend = composer.attachedFiles;
    const notesToSend = composer.selectedNotesForSend;
    const selectedNotesToRestore = composer.selectedNotes;

    display.setOptimisticUserMessage({
      id: `optimistic-${crypto.randomUUID()}`,
      chatId,
      userId: '',
      role: 'user',
      content: messageToSend,
      files: null,
      referencedNotes: notesToSend.length
        ? notesToSend.map((note) => ({ id: note.id, title: note.title ?? null }))
        : null,
      toolCalls: null,
      reasoning: null,
      parentMessageId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as ChatMessageDto);
    display.setPendingAssistantMessage(null);
    composer.clear();

    await streamMessage.stream({
      message: messageToSend,
      fileIds: filesToSend.map((file) => file.id),
      noteIds: notesToSend.map((note) => note.id),
      onAccepted: (userMessage) => {
        if (userMessage) display.setOptimisticUserMessage(userMessage);
      },
      onCommitted: (message) => {
        display.setPendingAssistantMessage(message);
      },
      onCancelled: () => composer.setDraft(messageToSend),
    });

    if (streamMessage.status === 'failed') {
      composer.restore({
        attachments: filesToSend,
        draft: messageToSend,
        notes: selectedNotesToRestore,
      });
    }

    display.setOptimisticUserMessage(null);
    display.setPendingAssistantMessage(null);
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl min-h-0 flex-1 flex-col">
      <Conversation>
        <ConversationContent>
          {display.displayMessages.map((message) => (
            <ChatMessageView
              key={message.id}
              isSpeechActive={activeSpeechMessageId === message.id}
              isToolResponding={toolCallRespond.isResponding}
              message={message}
              onActivateSpeech={activateSpeech}
              onApproveTool={({ messageId, toolCallId }) =>
                void toolCallRespond.respond({ messageId, toolCallId, approved: true })
              }
              onDeactivateSpeech={deactivateSpeech}
              onRejectTool={({ messageId, toolCallId }) =>
                void toolCallRespond.respond({ messageId, toolCallId, approved: false })
              }
              speechSrc={getSpeechUrl(chatId, message.id)}
            />
          ))}
          {display.isThinking ? (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Thinking</Shimmer>
              </MessageContent>
            </Message>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <ChatComposer
        attachments={composer.attachedFiles}
        contextContent={
          composer.suggestions.length > 0 || composer.selectedNotesForSend.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {composer.selectedNotesForSend.map((note) => (
                <span
                  key={note.id}
                  className="rounded-full bg-emphasis-faint px-2.5 py-1 text-xs text-text-secondary"
                >
                  {note.title || 'Untitled'}
                </span>
              ))}
              {composer.suggestions.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  className="rounded-full border border-border-subtle px-2.5 py-1 text-xs text-text-secondary"
                  onClick={() => composer.selectSuggestion(note)}
                >
                  {note.title || 'Untitled'}
                </button>
              ))}
            </div>
          ) : null
        }
        draft={composer.draft}
        error={
          composer.uploadState.errors.length > 0
            ? composer.uploadState.errors.join(', ')
            : streamMessage.error?.message
        }
        hasContext={composer.selectedNotesForSend.length > 0}
        isSubmitting={streamMessage.isStreaming || streamMessage.status === 'stopping'}
        isStreaming={streamMessage.isStreaming}
        isVoiceSupported={speech.isSupported}
        isListening={speech.isListening}
        onAttachFiles={(files) => void composer.attachFiles(files)}
        onChangeDraft={composer.setDraft}
        onRemoveAttachment={composer.removeAttachment}
        onStop={() => void streamMessage.cancel()}
        onSubmit={() => void handleSend()}
        onToggleVoice={() => speech.toggle(composer.draft)}
      />
    </div>
  );
}
