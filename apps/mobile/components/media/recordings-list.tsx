import type { Audio } from 'expo-av'
import { Button, StyleSheet, View } from 'react-native'
import { Text } from '~/theme'

export type Recording = {
  sound: Audio.Sound
  duration: number | undefined
  file: string | null
}
export type Recordings = Recording[]

export const RecordingsList = ({
  recordings,
  onRecordingLineSendClick,
}: { recordings: Recording[]; onRecordingLineSendClick: (file: string | null) => void }) => {
  if (recordings.length === 0) {
    return null
  }

  function getDurationFormatted(milliseconds: number | undefined) {
    if (!milliseconds) return '0:00'
    const minutes = milliseconds / 1000 / 60
    const minutesDisplay = Math.floor(minutes)
    const seconds = Math.round((minutes - minutesDisplay) * 60)
    const secondsDisplay = seconds < 10 ? `0${seconds}` : seconds
    return `${minutesDisplay}:${secondsDisplay}`
  }

  return (
    <View>
      {recordings.map((recording, index) => {
        return (
          <View key={index} style={styles.row}>
            <Text style={styles.fill}>
              Recording {index + 1} - {getDurationFormatted(recording.duration)}
            </Text>
            <Button onPress={() => recording.sound.replayAsync()} title="Play" />
            <Button onPress={() => onRecordingLineSendClick(recording.file)} title="Send" />
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    flex: 1,
    margin: 16,
  },
  button: {
    margin: 16,
    color: 'blue',
  },
})
