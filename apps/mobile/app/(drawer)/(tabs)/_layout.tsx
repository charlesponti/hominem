import { useRouter } from 'expo-router'
import { NativeTabs } from 'expo-router/unstable-native-tabs'
import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { theme } from '~/theme'

function TabsAccessory() {
  const router = useRouter()
  const placement = NativeTabs.BottomAccessory.usePlacement()

  return (
    <Pressable
      onPress={() => {
        router.push('/(drawer)/(tabs)/sherpa')
      }}
      style={({ pressed }) => [
        styles.accessory,
        placement === 'inline' ? styles.inline : styles.floating,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={styles.accessoryLabel}>Sherpa is live</Text>
      <Text style={styles.accessorySubtext}>Tap to continue the convo</Text>
    </Pressable>
  )
}

export default function TabsLayout() {
  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      tintColor={theme.colors['fg-primary']}
      disableTransparentOnScrollEdge
    >
      <NativeTabs.BottomAccessory>
        <TabsAccessory />
      </NativeTabs.BottomAccessory>

      <NativeTabs.Trigger name="start" role="search">
        <NativeTabs.Trigger.Label>Start</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'sparkles', selected: 'sparkles' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="focus">
        <NativeTabs.Trigger.Label>Focus</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'bolt.fill', selected: 'bolt.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="sherpa" role="search">
        <NativeTabs.Trigger.Label>Sherpa</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'sparkles', selected: 'sparkles' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}

const styles = StyleSheet.create({
  accessory: {
    flexDirection: 'column',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: theme.colors.grayLight,
    borderColor: theme.colors.grayMedium,
    borderWidth: 1,
  },
  floating: {
    marginHorizontal: 12,
  },
  inline: {
    marginHorizontal: 0,
  },
  pressed: {
    opacity: 0.7,
  },
  accessoryLabel: {
    color: theme.colors['fg-primary'],
    fontWeight: '600',
  },
  accessorySubtext: {
    color: theme.colors.quaternary,
    fontSize: 12,
  },
})
