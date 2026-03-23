import { ChatHeader, ChatMessageList, ChatReviewOverlay, ChatSearchModal } from '@hominem/ui/chat'
import { StyleSheet, View } from 'react-native'

import { FeatureErrorBoundary } from '~/components/error-boundary'
import { makeStyles } from '~/theme'
import { APP_NAME } from '~/utils/constants'
import { getLocalDate } from '~/utils/dates'

import AppIcon from '../ui/icon'
import { useChatController } from './use-chat-controller'
import type { SessionSource } from '@hominem/ui/chat'

type ChatProps = {
  chatId: string
  onChatArchive: () => void
  source: SessionSource
}

const renderIcon: React.ComponentProps<typeof ChatHeader>['renderIcon'] = (name, props) => (
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
  const styles = useStyles()
  const controller = useChatController({ chatId, onChatArchive, source })

  return (
    <View style={styles.container}>
      <ChatHeader
        topInset={0}
        resolvedSource={controller.resolvedSource}
        statusCopy={controller.statusCopy}
        onOpenSearch={controller.handleOpenSearch}
        onOpenMenu={controller.handleOpenMenu}
        renderIcon={renderIcon}
      />
      <ChatSearchModal
        visible={controller.showSearch}
        searchQuery={controller.searchQuery}
        resultCount={controller.displayMessages.length}
        searchInputRef={controller.searchInputRef}
        onClose={controller.handleCloseSearch}
        onChangeSearchQuery={controller.handleSearchQueryChange}
        renderIcon={renderIcon}
      />
      <ChatMessageList
        appName={APP_NAME}
        isMessagesLoading={controller.isMessagesLoading}
        displayMessages={controller.displayMessages}
        showSearch={controller.showSearch}
        searchQuery={controller.searchQuery}
        formatTimestamp={formatTimestamp}
        markdown={controller.Markdown}
        showDebug={controller.showDebug}
        speakingId={controller.speakingId}
        chatSendStatus={controller.chatSendStatus}
        onCopy={controller.handleCopyMessage}
        onEdit={controller.handleEditMessage}
        onRegenerate={controller.handleRegenerate}
        onDelete={controller.handleDeleteMessage}
        onSpeak={controller.handleSpeakMessage}
        onShare={(message) => {
          void controller.handleShareMessage(message)
        }}
        renderIcon={renderIcon}
      />
      <ChatReviewOverlay
        pendingReview={controller.pendingReview}
        isVisible={controller.isReviewVisible}
        onAccept={() => {
          void controller.handleAcceptReview()
        }}
        onReject={controller.handleRejectReview}
      />
    </View>
  )
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.colors['bg-elevated'],
      flexDirection: 'column',
    },
  }),
)

export const ChatWithErrorBoundary = (props: ChatProps) => (
  <FeatureErrorBoundary featureName="Chat">
    <Chat {...props} />
  </FeatureErrorBoundary>
)
