import { type ReactNode, useEffect, useRef } from 'react';
import { TextInput, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';

import { lineHeights, makeStyles } from '~/components/theme';
import { IconButton } from '~/components/ui/icon-button';
import { Input } from '~/components/ui/input';

interface TimeComposerProps {
  bottomInset: number;
  children?: ReactNode;
  disabled: boolean;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  state: 'idle' | 'parsing';
  value: string;
}

export function TimeComposer({
  bottomInset,
  children,
  disabled,
  onChangeText,
  onSubmit,
  state,
  value,
}: TimeComposerProps) {
  const styles = useStyles();
  const inputRef = useRef<TextInput>(null);
  const canSubmit = value.trim().length > 0;

  useEffect(() => {
    if (state === 'idle' && !value) return;
    if (state === 'idle') inputRef.current?.focus();
  }, [state, value]);

  return (
    <KeyboardStickyView
      offset={{ closed: 0, opened: 40 }}
      pointerEvents="box-none"
      style={[styles.dock, { paddingBottom: Math.max(bottomInset, 12) }]}
    >
      {children}
      <View style={styles.composer}>
        <Input
          ref={inputRef}
          accessibilityLabel="Add or search time"
          editable={!disabled}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          placeholder="Add or search anything…"
          returnKeyType="send"
          style={styles.input}
          testID="time-composer-input"
          value={value}
        />
        {canSubmit || state === 'parsing' ? (
          <IconButton
            accessibilityLabel={
              state === 'parsing' ? 'Interpreting time request' : 'Interpret time request'
            }
            disabled={disabled || !canSubmit}
            icon="arrow.up.circle.fill"
            isAnimating={state === 'parsing'}
            testID="time-composer-submit"
            tintColor={styles.icon.color}
            variant="ghost"
            onPress={onSubmit}
          />
        ) : null}
      </View>
    </KeyboardStickyView>
  );
}

const useStyles = makeStyles((theme) => ({
  composer: {
    alignItems: 'center',
    backgroundColor: theme.colors['card'],
    borderColor: theme.colors['border-default'],
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  dock: {
    bottom: 0,
    gap: 8,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  icon: { color: theme.colors.primary },
  input: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    flex: 1,
    height: 44,
    lineHeight: lineHeights.body,
    paddingHorizontal: 0,
    paddingVertical: 0,
    transform: [{ translateY: -2 }],
  },
}));
