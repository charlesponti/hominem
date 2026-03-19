import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { FeatureErrorBoundary } from '~/components/error-boundary'
import { makeStyles } from '~/theme'

import { ChatHeader } from './chat-header'
import { ChatMessageList } from './chat-message-list'
import { ChatReviewOverlay } from './chat-review-overlay'
import { ChatSearchModal } from './chat-search-modal'
import type { SessionSource } from './context-anchor'
import { useChatController } from './use-chat-controller'

type ChatProps = {
  chatId: string
  onChatArchive: () => void
  source: SessionSource
}

export const Chat = ({ chatId, onChatArchive, source }: ChatProps) => {
  const styles = useStyles()
  const { top } = useSafeAreaInsets()
  const controller = useChatController({ chatId, onChatArchive, source })

  return (
    <View style={styles.container}>
      <ChatHeader
        topInset={top}
        resolvedSource={controller.resolvedSource}
        statusCopy={controller.statusCopy}
        onArchiveChatPress={controller.handleArchiveChat}
        onOpenSearch={controller.handleOpenSearch}
        onOpenMenu={controller.handleOpenMenu}
      />
      <ChatSearchModal
        visible={controller.showSearch}
        searchQuery={controller.searchQuery}
        resultCount={controller.displayMessages.length}
        searchInputRef={controller.searchInputRef}
        onClose={controller.handleCloseSearch}
        onChangeSearchQuery={controller.handleSearchQueryChange}
      />
      <ChatMessageList
        isMessagesLoading={controller.isMessagesLoading}
        displayMessages={controller.displayMessages}
        showSearch={controller.showSearch}
        searchQuery={controller.searchQuery}
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
      backgroundColor: t.colors.background,
      flexDirection: 'column',
    },
  }),
)

export const ChatWithErrorBoundary = (props: ChatProps) => (
  <FeatureErrorBoundary featureName="Chat">
    <Chat {...props} />
  </FeatureErrorBoundary>
)
