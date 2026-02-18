import { Link, useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import DatePicker from 'react-native-date-picker'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import { Button } from '~/components/Button'
import TextInput from '~/components/text-input'
import MindsherpaIcon from '~/components/ui/icon'
import { Text, theme } from '~/theme'
import { getLocalDate, getTimezone } from '~/utils/dates'
import queryClient from '~/utils/query-client'
import type { FocusItem } from '~/utils/services/notes/types'
import {
  useUpdateFocusItem,
  type UpdateFocusItemInput,
} from '~/utils/services/notes/use-update-focus'

function getFocusItemDate(focusItem: FocusItem) {
  if (!focusItem.due_date) return null
  const { localDate } = getLocalDate(new Date(focusItem.due_date))
  return localDate
}

export default function FocusItemView() {
  const { id } = useLocalSearchParams()
  const updateFocusItem = useUpdateFocusItem()
  const focusItems: FocusItem[] = queryClient.getQueryData(['focusItems']) || []
  const focusItem = focusItems?.find((item) => item.id === String(id))

  if (!focusItem) {
    return null
  }

  const [text, setText] = useState(focusItem.text || '')
  const [category, setCategory] = useState(focusItem.category || '')
  const [due_date, setDueDate] = useState(focusItem.due_date ? new Date(focusItem.due_date) : null)
  const [open, setOpen] = useState(false)

  const handleDateChange = (selectedDate: Date) => {
    setOpen(false)
    setDueDate(selectedDate)
    // Here you would typically update the focusItem in your state or send an API request
  }

  const dueDateTap = Gesture.Tap().onStart(() => {
    runOnJS(setOpen)(true)
  })

  const onFormSubmit = useCallback(async () => {
    if (!focusItem) {
      return
    }

    const input: UpdateFocusItemInput = {
      id: focusItem.id,
      text,
      category,
      ...(due_date ? { due_date } : {}),
      timezone: getTimezone(),
    }

    try {
      const data = await updateFocusItem.mutateAsync(input)
      const prevData = queryClient.getQueryData(['focusItems']) || []
      if (!prevData || !Array.isArray(prevData)) {
        return
      }
      const nextData = prevData.map((item) => (item.id === focusItem.id ? data : item))
      queryClient.setQueryData(['focusItems'], nextData)
    } catch (error) {
      console.error(error)
    }
  }, [focusItem, updateFocusItem, category, due_date, text])

  return (
    <Link.AppleZoomTarget>
      <View style={styles.container}>
        <View style={styles.formGroup}>
          <View>
            <TextInput
              aria-disabled
              placeholder="Enter your name"
              label="Name"
              value={text}
              style={styles.inputText}
              onChange={(e) => setText(e.nativeEvent.text)}
            />
          </View>
          {due_date ? (
            <View style={styles.dueDateRow}>
              <MindsherpaIcon name="calendar" size={16} color={theme.colors.black} />
              <GestureDetector gesture={dueDateTap}>
                <Text variant="body">
                  {due_date.toLocaleDateString()} {due_date.toLocaleTimeString()}
                </Text>
              </GestureDetector>
              <DatePicker
                modal
                open={open}
                date={due_date}
                onConfirm={handleDateChange}
                onCancel={() => setOpen(false)}
              />
            </View>
          ) : null}
          <View style={styles.footer}>{/* keep buttons centered */}
            <Button onPress={onFormSubmit}>Save</Button>
          </View>
        </View>
      </View>
    </Link.AppleZoomTarget>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: theme.colors.white,
  },
  formGroup: {
    rowGap: 24,
    marginTop: 32,
  },
  inputText: {
    fontSize: 24,
    color: theme.colors.black,
    fontWeight: 'bold',
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    paddingHorizontal: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
})
