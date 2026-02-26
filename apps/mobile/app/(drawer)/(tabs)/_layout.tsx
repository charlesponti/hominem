import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import React from 'react';

import { theme } from '~/theme';

export default function TabsLayout() {
  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      tintColor={theme.colors['fg-primary']}
      disableTransparentOnScrollEdge
    >
      <NativeTabs.Trigger name="start" role="search">
        <Label>START</Label>
        <Icon sf={{ default: 'sparkles', selected: 'sparkles' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="focus">
        <Label>FOCUS</Label>
        <Icon sf={{ default: 'bolt.fill', selected: 'bolt.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="sherpa" role="search">
        <Label>SHERPA</Label>
        <Icon sf={{ default: 'sparkles', selected: 'sparkles' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="account">
        <Label>ACCOUNT</Label>
        <Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
