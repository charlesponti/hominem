import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import React, { useCallback } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppIcon from '~/components/ui/icon';
import { theme } from '~/theme';
import { APP_NAME } from '~/utils/constants';

import {
  MOBILE_WORKSPACE_LABELS,
  MOBILE_WORKSPACE_ROUTES,
  type MobileWorkspaceContext,
} from './mobile-workspace-config';
import { useMobileWorkspace } from './mobile-workspace-context';

const MOBILE_WORKSPACE_ICONS: Record<
  MobileWorkspaceContext,
  React.ComponentProps<typeof AppIcon>['name']
> = {
  inbox: 'inbox',
  note: 'pen-to-square',
  chat: 'comment',
  search: 'magnifying-glass',
  settings: 'gear',
};

const iconStyle: TextStyle = {
  lineHeight: 16,
  textAlign: 'center',
};

const INBOX_ROUTE = '/(protected)/(tabs)/focus' as Href;

export const MobileWorkspaceSwitcher = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeContext, contexts, setActiveContext } = useMobileWorkspace();
  const isContextualView = activeContext === 'note' || activeContext === 'chat';

  const onReturnToInbox = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveContext('inbox');
    router.push(INBOX_ROUTE);
  }, [router, setActiveContext]);

  const onPress = useCallback(
    (context: MobileWorkspaceContext) => {
      void Haptics.selectionAsync();
      setActiveContext(context);

      const route = MOBILE_WORKSPACE_ROUTES[context];
      if (route) {
        router.push(route);
      }
    },
    [router, setActiveContext],
  );

  return (
    <View style={[styles.shell, { paddingTop: insets.top + 6 }]} testID="mobile-workspace-switcher">
      <View style={styles.headerRow}>
        <View style={styles.leading}>
          {isContextualView ? (
            <Pressable
              accessibilityLabel="Return to inbox"
              accessibilityRole="button"
              onPress={onReturnToInbox}
              style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}
            >
              <AppIcon name="arrow-left" size={16} color={theme.colors.foreground} />
            </Pressable>
          ) : (
            <View style={styles.logoWrap}>
              <Image
                source={require('../../assets/logo.web.png')}
                style={styles.logo}
                resizeMode="cover"
                accessibilityLabel={APP_NAME}
              />
            </View>
          )}
        </View>

        <View style={styles.trailing}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.container}
            style={styles.contextScroller}
          >
            {contexts.map((context) => {
              const isActive = context === activeContext;

              return (
                <Pressable
                  key={context}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={MOBILE_WORKSPACE_LABELS[context]}
                  onPress={() => onPress(context)}
                  style={({ pressed }) => [
                    styles.item,
                    isActive ? styles.itemActive : null,
                    pressed ? styles.pressed : null,
                  ]}
                  testID={`mobile-workspace-context-${context}`}
                >
                  <AppIcon
                    name={MOBILE_WORKSPACE_ICONS[context]}
                    size={16}
                    color={isActive ? theme.colors.background : theme.colors.foreground}
                    style={iconStyle}
                    useSymbol
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
      <View style={styles.divider} />
    </View>
  );
};

const styles = StyleSheet.create({
  shell: {},
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  leading: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    width: 36,
  },
  trailing: {
    flexShrink: 0,
  },
  contextScroller: {
    flexGrow: 0,
  },
  logoWrap: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  logo: {
    height: 36,
    width: 36,
  },
  backButton: {
    alignItems: 'center',
    borderColor: theme.colors['border-default'],
    borderRadius: theme.borderRadii.full,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm_8,
  },
  item: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
    borderRadius: theme.borderRadii.full,
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    width: 36,
  },
  itemActive: {
    backgroundColor: theme.colors.foreground,
    borderColor: theme.colors.foreground,
  },
  pressed: {
    opacity: 0.72,
  },
  divider: {
    backgroundColor: theme.colors['border-default'],
    height: StyleSheet.hairlineWidth,
  },
});
