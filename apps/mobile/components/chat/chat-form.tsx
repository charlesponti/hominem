import { useCallback, useState, type PropsWithChildren } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Text, theme } from '~/theme'
import { useSendMessage } from '~/utils/services/chat/use-chat-messages'
import { FeedbackBlock } from '../feedback-block'
import { FormSubmitButton } from '../notes/note-form-submit-button'
import AutoGrowingInput from '../text-input-autogrow'
import MindsherpaIcon from '../ui/icon'
import { UploadFileButton } from '../upload-file-button'
import AudioTranscriber from './audio-transcriber'

type ChatFormProps = {
  chatId: string
  onEndChat: () => void
}
export const ChatForm = (props: ChatFormProps) => {
  const { chatId } = props
  const [isRecording, setIsRecording] = useState(false)
  const [transcribeError, setTranscribeError] = useState<boolean>(false)
  const { isChatSending, message, setMessage, sendChatMessage, sendChatError, setSendChatError } =
    useSendMessage({ chatId })

  const onRecordingStateChange = useCallback((isRecording: boolean) => {
    setIsRecording(isRecording)
  }, [])

  const onAudioTranscribed = useCallback(
    (transcription: string) => {
      setMessage(transcription)
    },
    [setMessage]
  )

  const handleSubmit = () => {
    sendChatMessage()
  }

  const handleTranscribeError = () => {
    setTranscribeError(true)
  }

  return (
    <View style={[styles.container]}>
      {sendChatError ? (
        <NoteFormError>
          <Text variant="body" color="white">
            There was an issue sending your message to Sherpa.
          </Text>
          <Pressable onPress={() => setSendChatError(false)}>
            <MindsherpaIcon
              name="circle-x"
              size={26}
              color={theme.colors.grayMedium}
              style={noteFormErrorStyles.closeButton}
            />
          </Pressable>
        </NoteFormError>
      ) : null}
      {transcribeError ? (
        <NoteFormError>
          <Text variant="body" color="black">
            There was an issue transcribing your input.
          </Text>
          <Pressable onPress={() => setTranscribeError(false)}>
            <MindsherpaIcon
              name="circle-x"
              size={26}
              color={theme.colors.grayMedium}
              style={noteFormErrorStyles.closeButton}
            />
          </Pressable>
        </NoteFormError>
      ) : null}
      <View style={[styles.inputContainer]}>
        {!isRecording ? (
          <>
            <AutoGrowingInput
              editable={!isRecording && !isChatSending}
              value={message}
              onChangeText={setMessage}
              style={{ flex: 1, fontSize: 20, paddingVertical: 4 }}
            />
            {message && message.length > 0 ? (
              <FormSubmitButton
                isRecording={isRecording}
                isLoading={isChatSending}
                onSubmitButtonClick={handleSubmit}
              />
            ) : null}
          </>
        ) : null}
        {!message || message.length === 0 ? (
          <AudioTranscriber
            onError={handleTranscribeError}
            onRecordingStateChange={onRecordingStateChange}
            onAudioTranscribed={onAudioTranscribed}
          />
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderColor: theme.colors.grayMedium,
    borderWidth: 1,
    borderRadius: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 4,
  },
  mediaButtons: {},
})

const NoteFormError = ({ children }: PropsWithChildren) => {
  return (
    <FeedbackBlock>
      <View style={[noteFormErrorStyles.container]}>{children}</View>
    </FeedbackBlock>
  )
}

const noteFormErrorStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  closeButton: {
    paddingHorizontal: 8,
  },
})
