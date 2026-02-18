import { Stack } from 'expo-router'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { Button } from '~/components/Button'

export default function FocusLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen
        name="insights"
        options={{
          presentation: 'formSheet',
          headerTitle: 'Focus rituals',
          sheetAllowedDetents: [0.41, 0.61],
          sheetGrabberVisible: true,
          sheetFooter: <FocusSheetFooter />,
        }}
      />
    </Stack>
  )
}

const FocusSheetFooter = () => (
  <View style={styles.footer}>
    <Button title="Start focus streak" onPress={() => {}} style={styles.footerButton} />
    <Button title="Report status" onPress={() => {}} style={styles.footerButton} />
  </View>
)

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    columnGap: 12,
    padding: 16,
    backgroundColor: 'white',
  },
  footerButton: {
    flex: 1,
  },
})
