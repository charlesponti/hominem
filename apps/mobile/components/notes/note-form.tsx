import { captureException } from '@sentry/react-native'
import type { PropsWithChildren } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { VOID_MOTION_DURATION_STANDARD } from '~/theme/motion'
import { Text, theme } from '~/theme'
import queryClient from '~/utils/query-client'
import { LocalStore } from '~/utils/local-store'
import type { FocusItem } from '~/utils/services/notes/types'
import { useKeyboardVisible } from '~/utils/use-keyboard-listener'
import { FeedbackBlock } from '../feedback-block'
import type { ActiveSearch } from '../focus/focus-search'
import AudioRecorder from '../media/audio-recorder'
import AutoGrowingInput from '../text-input-autogrow'
import MindsherpaIcon from '../ui/icon'
import { UploadFileButton } from '../upload-file-button'
import { NoteFormMessage } from './note-form-message'
import { FormSubmitButton } from './note-form-submit-button'
import { useGetUserIntent, type GeneratedIntentsResponse } from './use-get-user-intent'
import { toLocalFocusItem } from '~/utils/services/notes/local-focus'

type NoteFormProps = {
  isRecording: boolean
  setActiveChat: (chatId: string) => void
  setActiveSearch: (search: ActiveSearch) => void
  setIsRecording: (isRecording: boolean) => void
}
export const NoteForm = (props: NoteFormProps) => {
  const { isRecording, setActiveSearch, setIsRecording, setActiveChat } = props
  const [content, setContent] = useState('')
  const [createError, setCreateError] = useState<boolean>(false)
  const [generateError, setGenerateError] = useState<boolean>(false)
  const [intentOutput, setIntentOutput] = useState<string | null>(null)
  const { isKeyboardVisible } = useKeyboardVisible()
  const buttonsPaddingBottom = useSharedValue(0)
  const { audioIntentMutation, textIntentMutation } = useGetUserIntent({
    onSuccess: (data) => {
      onGeneratedIntents(data)
    },
    onError: (error) => {
      console.error('Error generating intent:', error)
      captureException(error)
      setGenerateError(true)
    },
  })
  const { mutate: generateFocusFromAudio, isPending: isAudioIntentGenerating } = audioIntentMutation
  const { mutate: generateFocusItems, isPending: isTextIntentGenerating } = textIntentMutation

  const buttonsStyle = useAnimatedStyle(() => {
    return {
      paddingBottom: buttonsPaddingBottom.value,
    }
  })

  useEffect(() => {
    buttonsPaddingBottom.value = withTiming(isKeyboardVisible ? 4 : 16, {
      duration: VOID_MOTION_DURATION_STANDARD,
    })
  }, [buttonsPaddingBottom, isKeyboardVisible])

  const onGeneratedIntents = useCallback(
    async (data: GeneratedIntentsResponse) => {
      const searchTasks = data.search?.output?.map(normalizeGeneratedTask) ?? []
      const createTasks = data.create?.output?.map(normalizeGeneratedTask) ?? []
      const chatMessage = data.chat?.output

      if (chatMessage && chatMessage.length > 0) {
        setIntentOutput(chatMessage)
        return
      }

      if (searchTasks.length > 0 && data.output && data.search?.input.keyword) {
        setContent('')
        await Promise.all(searchTasks.map((item) => LocalStore.upsertFocusItem(toLocalFocusItem(item))))
        queryClient.setQueryData(['focusItems'], searchTasks)
        setActiveSearch({
          count: searchTasks.length,
          keyword: data.search?.input.keyword,
        })
        /**
         * The product should show the user the search results, so this function returns
         * instead of displaying the newly created tasks.
         */
        return
      }

      if (createTasks.length > 0) {
        setContent('')
        await Promise.all(createTasks.map((item) => LocalStore.upsertFocusItem(toLocalFocusItem(item))))
        const previousItems: FocusItem[] = queryClient.getQueryData(['focusItems']) || []
        queryClient.setQueryData(['focusItems'], [...(previousItems || []), ...createTasks])
      }
    },
    [setActiveSearch]
  )

  const onStartRecording = useCallback(() => {
    setIsRecording(true)
  }, [setIsRecording])

  const onStopRecording = useCallback(
    (data: string | null) => {
      setIsRecording(false)
      if (!data) return
      generateFocusFromAudio(data)
    },
    [generateFocusFromAudio, setIsRecording]
  )

  const handleSubmit = () => {
    setGenerateError(false)
    generateFocusItems(content)
  }

  const isGenerating = isTextIntentGenerating || isAudioIntentGenerating

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      style={[styles.container, { paddingTop: intentOutput && intentOutput.length > 0 ? 16 : 0 }]}
    >
      {createError ? (
        <NoteFormError>
          <Text variant="body" color="white">
            FOCUS WRITE FAILURE.
          </Text>
          <Pressable onPress={() => setCreateError(false)}>
            <MindsherpaIcon
              name="circle-x"
              size={26}
              color={theme.colors.grayMedium}
              style={noteFormErrorStyles.closeButton}
            />
          </Pressable>
        </NoteFormError>
      ) : null}
      {intentOutput ? (
        <NoteFormMessage
          sherpaMessage={intentOutput}
          userMessage={content}
          onChatCreated={(chatId) => setActiveChat(chatId)}
          onCloseClick={() => setIntentOutput(null)}
        />
      ) : null}
      {generateError ? <GenerateError onCloseClick={() => setGenerateError(false)} /> : null}
      {!isRecording && !intentOutput ? (
        <View style={[styles.inputContainer]}>
          <AutoGrowingInput
            editable={!isRecording && isGenerating}
            value={content}
            onChangeText={setContent}
          />
        </View>
      ) : null}
      <Animated.View style={[styles.actionButtons, buttonsStyle]}>
        <View style={[styles.mediaButtons]}>
          <UploadFileButton />
          <AudioRecorder onStartRecording={onStartRecording} onStopRecording={onStopRecording} />
        </View>
        <FormSubmitButton
          isRecording={isRecording}
          isLoading={isGenerating}
          onSubmitButtonClick={handleSubmit}
        />
      </Animated.View>
    </KeyboardAvoidingView>
  )
}

type LegacyGeneratedTask = {
  id: number | string
  text: string
  category?: string
  due_date?: string | null
  state?: 'backlog' | 'active' | 'completed' | 'deleted'
  created_at?: string
  updated_at?: string
}

function normalizeGeneratedTask(task: LegacyGeneratedTask): FocusItem {
  return {
    id: String(task.id),
    text: task.text,
    type: 'task',
    category: task.category ?? 'task',
    due_date: task.due_date ?? null,
    state: task.state === 'completed' ? 'completed' : 'active',
    priority: 0,
    sentiment: 'neutral',
    task_size: 'medium',
    profile_id: '',
    created_at: task.created_at ?? new Date().toISOString(),
    updated_at: task.updated_at ?? new Date().toISOString(),
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    minWidth: '100%',
    maxHeight: '100%',
    flexDirection: 'column',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    paddingVertical: 240,
    gap: 8,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 20,
  },
  inputContainer: {},
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mediaButtons: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    columnGap: 16,
    alignSelf: 'flex-start',
    marginRight: 16,
  },
})

const NoteFormError = ({ children }: PropsWithChildren) => {
  return (
    <FeedbackBlock error>
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

const GenerateError = ({ onCloseClick }: { onCloseClick: () => void }) => {
  return (
    <NoteFormError>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 12 }}>
          <MindsherpaIcon
            name="circle-exclamation"
            size={26}
            color={theme.colors.tomato}
            style={noteFormErrorStyles.closeButton}
          />
          <View style={{ flex: 1, paddingLeft: 12 }}>
            <Text variant="body" color="black">
              SHERPA UNAVAILABLE.
            </Text>
            <Text variant="body" color="secondaryForeground">
              RETRY LATER.
            </Text>
          </View>
        </View>
        <Pressable
          onPress={onCloseClick}
          style={[
            {
              borderRadius: 8,
              borderWidth: 1,
              borderColor: theme.colors.tomato,
              marginTop: 24,
              paddingVertical: 8,
              alignItems: 'center',
            },
          ]}
        >
          <Text variant="body" color="foreground">
            CLOSE
          </Text>
        </Pressable>
      </View>
    </NoteFormError>
  )
}
