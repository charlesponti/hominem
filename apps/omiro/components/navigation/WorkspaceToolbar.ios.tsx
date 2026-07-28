import type { SFSymbol } from 'expo-symbols';
import { useEffect, useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, Text, useThemeColors } from '~/components/theme';
import AppIcon from '~/components/ui/icon';
import { Input } from '~/components/ui/input';
import type { WorkspaceContext } from '~/components/workspace/workspace-types';
import { useReducedMotion } from '~/hooks/use-reduced-motion';

interface WorkspaceToolbarProps {
  activeContext: WorkspaceContext;
  isSearching: boolean;
  showSearch: boolean;
  searchPlaceholder: string;
  searchQuery: string;
  onContextChange: (context: WorkspaceContext) => void;
  onOpenSettings: () => void;
  onSearchCancel: () => void;
  onSearchChange: (query: string) => void;
  onSearchStart: () => void;
}

const contextOptions: Array<{
  icon: SFSymbol;
  label: string;
  value: WorkspaceContext;
}> = [
  { icon: 'bubble.left.and.bubble.right.fill', label: 'Chats', value: 'chats' },
  { icon: 'note.text', label: 'Notes', value: 'notes' },
  { icon: 'clock.fill', label: 'Time', value: 'time' },
];

export function WorkspaceToolbar(props: WorkspaceToolbarProps) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const reducedMotion = useReducedMotion();

  return (
    <Animated.View
      layout={reducedMotion ? undefined : LinearTransition.duration(180)}
      style={[styles.toolbar, { paddingTop: insets.top }]}
      testID="workspace-toolbar"
    >
      {props.isSearching ? (
        <WorkspaceSearch {...props} />
      ) : (
        <View style={styles.restingRow}>
          <View accessibilityRole="tablist" style={styles.contextSwitch}>
            {contextOptions.map((option) => (
              <ContextButton
                key={option.value}
                active={props.activeContext === option.value}
                {...option}
                onPress={() => props.onContextChange(option.value)}
              />
            ))}
          </View>
          <View style={styles.actions}>
            {props.showSearch ? (
              <ToolbarIconButton
                accessibilityLabel="Search"
                icon="magnifyingglass"
                testID="workspace-search-button"
                onPress={props.onSearchStart}
              />
            ) : null}
            <ToolbarIconButton
              accessibilityLabel="Open settings"
              icon="person.crop.circle"
              testID="workspace-settings-button"
              onPress={props.onOpenSettings}
            />
          </View>
        </View>
      )}
    </Animated.View>
  );
}

function ContextButton({
  active,
  icon,
  label,
  value,
  onPress,
}: {
  active: boolean;
  icon: SFSymbol;
  label: string;
  value: WorkspaceContext;
  onPress: () => void;
}) {
  const styles = useStyles();
  const themeColors = useThemeColors();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.contextButton,
        active && styles.contextButtonActive,
        pressed && styles.pressed,
      ]}
      testID={`workspace-context-${value}`}
    >
      <AppIcon
        name={icon}
        size={18}
        tintColor={active ? themeColors['text-primary'] : themeColors['text-secondary']}
      />
      <Text
        color={active ? 'text-primary' : 'text-secondary'}
        style={styles.contextLabel}
        variant="caption1"
      >
        {label}
      </Text>
    </Pressable>
  );
}

function WorkspaceSearch({
  searchPlaceholder,
  searchQuery,
  onSearchCancel,
  onSearchChange,
}: Pick<
  WorkspaceToolbarProps,
  'searchPlaceholder' | 'searchQuery' | 'onSearchCancel' | 'onSearchChange'
>) {
  const inputRef = useRef<TextInput>(null);
  const styles = useStyles();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <View style={styles.searchRow}>
      <Input
        ref={inputRef}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        placeholder={searchPlaceholder}
        returnKeyType="search"
        style={styles.searchInput}
        testID="workspace-search-input"
        value={searchQuery}
        onChangeText={onSearchChange}
      />
      <Pressable
        accessibilityLabel="Close search"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onSearchCancel}
        style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
        testID="workspace-search-cancel"
      >
        <Text color="text-primary" style={styles.cancelLabel} variant="subhead">
          Cancel
        </Text>
      </Pressable>
    </View>
  );
}

function ToolbarIconButton({
  accessibilityLabel,
  icon,
  testID,
  onPress,
}: {
  accessibilityLabel: string;
  icon: SFSymbol;
  testID: string;
  onPress: () => void;
}) {
  const styles = useStyles();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
      testID={testID}
    >
      <AppIcon name={icon} size={20} />
    </Pressable>
  );
}

const useStyles = makeStyles((theme) => ({
  toolbar: {
    backgroundColor: theme.colors.background,
    borderBottomColor: theme.colors['border-default'],
    borderBottomWidth: 1,
    paddingBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  restingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    height: 44,
    justifyContent: 'space-between',
  },
  contextSwitch: {
    backgroundColor: theme.colors.muted,
    borderColor: theme.colors['border-default'],
    borderRadius: theme.borderRadii.md,
    borderWidth: 1,
    flexDirection: 'row',
    height: 40,
    padding: 2,
  },
  contextButton: {
    alignItems: 'center',
    borderRadius: theme.borderRadii.sm,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minWidth: 66,
    paddingHorizontal: theme.spacing.sm,
  },
  contextButtonActive: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors['border-default'],
    borderWidth: 1,
  },
  contextLabel: {
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  iconButton: {
    alignItems: 'center',
    borderColor: theme.colors['border-default'],
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  searchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    height: 44,
  },
  searchInput: {
    flex: 1,
    height: 44,
  },
  cancelButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  cancelLabel: {
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.6,
  },
}));
