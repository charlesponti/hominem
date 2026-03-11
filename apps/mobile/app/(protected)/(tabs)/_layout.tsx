import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';

import { theme } from '~/theme';

export default function TabsLayout() {
  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      tintColor={theme.colors.primary}
      disableTransparentOnScrollEdge
    >
      <NativeTabs.Trigger name="start" role="search">
        <NativeTabs.Trigger.Label>START</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'sparkles', selected: 'sparkles' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="focus">
        <NativeTabs.Trigger.Label>FOCUS</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'bolt.fill', selected: 'bolt.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="sherpa" role="search">
        <NativeTabs.Trigger.Label>SHERPA</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'sparkles', selected: 'sparkles' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>ACCOUNT</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
