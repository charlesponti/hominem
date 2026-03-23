import { Chat as _Chat } from '@hominem/ui/chat'
import type { SessionSource } from '@hominem/ui/chat'
import { useQueryClient } from '@tanstack/react-query'
import React from 'react'

import { FeatureErrorBoundary } from '~/components/error-boundary'
import { useSpeech } from '~/components/media/use-speech'
import { makeStyles } from '~/theme'
import { APP_NAME } from '~/utils/constants'
import { getLocalDate } from '~/utils/dates'
import { invalidateInboxQueries } from '~/utils/services/inbox/inbox-refresh'
import { useArchiveChat, useChatMessages, useSendMessage } from '~/utils/services/chat'
import { chatKeys } from '~/utils/services/notes/query-keys'

import AppIcon from '../ui/icon'

type ChatProps = {
  chatId: string
  onChatArchive: () => void
  source: SessionSource
}

const renderIcon: React.ComponentProps<typeof _Chat>['renderIcon'] = (name, props) => (
  <AppIcon
    color={props.color}
    name={name}
    size={props.size}
    style={props.style}
    useSymbol={props.useSymbol}
  />
)

const formatTimestamp = (value: string) => getLocalDate(new Date(value)).localDateString

export const Chat = ({ chatId, onChatArchive, source }: ChatProps) => {
  const { speakingId, speak } = useSpeech()
  const queryClient = useQueryClient()
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const styles = useStyles()

  return (
    <_Chat
      chatId={chatId}
      onChatArchive={onChatArchive}
      source={source}
      services={{
        useChatMessages,
        useSendMessage,
        useArchiveChat,
        chatKeys,
        speech: { speakingId, speak },
        onNoteCreated: () => invalidateInboxQueries(queryClient),
      }}
      renderIcon={renderIcon}
      formatTimestamp={formatTimestamp}
      containerStyle={styles.container}
    />
  )
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors['bg-elevated'],
    flexDirection: 'column' as const,
  },
}))

export const ChatWithErrorBoundary = (props: ChatProps) => (
  <FeatureErrorBoundary featureName="Chat">
    <Chat {...props} />
  </FeatureErrorBoundary>
)
