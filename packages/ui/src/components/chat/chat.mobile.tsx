import { ChatHeader, ChatMessageList, ChatReviewOverlay, ChatSearchModal } from './index.mobile'
import { StyleSheet, View } from 'react-native'

import type { SessionSource } from './index.mobile'
import { useChatController, type ChatServices } from './use-chat-controller.mobile'

// These app-specific imports stay as peer dependencies provided by the host app
// makeStyles and APP_NAME / getLocalDate are mobile-app-specific, so we accept them as props
// For simplicity we inline the styles and accept formatTimestamp + renderIcon as props

type ChatSendStatus = 'idle' | 'submitted' | 'streaming' | 'error'

type ChatProps = {
  chatId: string
  onChatArchive: () => void
  source: SessionSource
  services: ChatServices
  renderIcon: React.ComponentProps<typeof ChatHeader>['renderIcon']
  formatTimestamp: (value: string) => string
  containerStyle?: object
}

export const Chat = ({
  chatId,
  onChatArchive,
  source,
  services,
  renderIcon,
  formatTimestamp,
  containerStyle,
}: ChatProps) => {
  const controller = useChatController({ chatId, onChatArchive, source, services })
  const chatSendStatus = controller.chatSendStatus as ChatSendStatus

  return (
    <View style={[styles.container, containerStyle]}>
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
        isMessagesLoading={controller.isMessagesLoading}
        displayMessages={controller.displayMessages}
        showSearch={controller.showSearch}
        searchQuery={controller.searchQuery}
        formatTimestamp={formatTimestamp}
        markdown={controller.Markdown}
        showDebug={controller.showDebug}
        speakingId={controller.speakingId}
        chatSendStatus={chatSendStatus}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
})
