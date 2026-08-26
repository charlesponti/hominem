import { Stack, useNavigation, useRouter } from 'expo-router';
import type { ReactNode } from 'react';

export function InboxDetailChrome({ children }: { children: ReactNode }) {
  const navigation = useNavigation();
  const router = useRouter();
  const canGoBack = navigation.canGoBack();

  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      {canGoBack ? (
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button icon="chevron.left" onPress={() => router.back()} />
        </Stack.Toolbar>
      ) : null}
      {children}
    </>
  );
}
