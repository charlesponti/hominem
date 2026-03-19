import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { NoteContextScreen } from '~/components/workspace/note-context-screen';
import { SearchContextScreen } from '~/components/workspace/search-context-screen';
import { MobileWorkspaceSwitcher } from '~/components/workspace/mobile-workspace-switcher';
import { useMobileWorkspace } from '~/components/workspace/mobile-workspace-context';
import { resolveMobileWorkspaceView } from '~/components/workspace/mobile-workspace-view';

export default function TabsLayout() {
  const { activeContext } = useMobileWorkspace();
  const view = resolveMobileWorkspaceView(activeContext);

  return (
    <View style={styles.container}>
      <MobileWorkspaceSwitcher />
      <View style={styles.content}>
        {view === 'note' ? <NoteContextScreen /> : null}
        {view === 'search' ? <SearchContextScreen /> : null}
        {view === 'stack' ? (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="focus" />
            <Stack.Screen name="sherpa" />
            <Stack.Screen name="start" />
            <Stack.Screen name="account" />
          </Stack>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
})
