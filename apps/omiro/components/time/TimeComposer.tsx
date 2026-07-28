import { type ReactNode, useEffect, useRef, useState } from 'react';
import type { TextInputRef } from '@expo/ui';

import { ComposerDock } from '~/components/composer/ComposerDock';
import { ComposerSurface } from '~/components/composer/ComposerSurface';
import { ComposerTextField } from '~/components/composer/ComposerTextField';
import { useThemeColors } from '~/components/theme';
import AppIcon from '~/components/ui/icon';
import { IconButton } from '~/components/ui/icon-button';

interface TimeComposerProps {
  children?: ReactNode;
  disabled: boolean;
  onChangeText: (value: string) => void;
  onHeightChange: (height: number) => void;
  onSubmit: () => void;
  state: 'idle' | 'parsing';
  value: string;
}

export function TimeComposer({
  children,
  disabled,
  onChangeText,
  onHeightChange,
  onSubmit,
  state,
  value,
}: TimeComposerProps) {
  const themeColors = useThemeColors();
  const inputRef = useRef<TextInputRef>(null);
  const [isFocused, setIsFocused] = useState(false);
  const canSubmit = value.trim().length > 0;

  useEffect(() => {
    if (state === 'idle' && value) inputRef.current?.focus();
  }, [state, value]);

  return (
    <ComposerDock onHeightChange={onHeightChange} testID="time-composer-dock">
      {children}
      <ComposerSurface
        focused={isFocused}
        testID="time-composer"
        actions={
          <>
            <AppIcon name="sparkles" size={22} tintColor={themeColors['text-primary']} />
            {canSubmit || state === 'parsing' ? (
              <IconButton
                accessibilityLabel={
                  state === 'parsing' ? 'Interpreting time request' : 'Interpret time request'
                }
                disabled={disabled || !canSubmit}
                icon="arrow.up"
                testID="time-composer-submit"
                onPress={onSubmit}
              />
            ) : null}
          </>
        }
      >
        <ComposerTextField
          disabled={disabled}
          ref={inputRef}
          onBlur={() => setIsFocused(false)}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onSubmitEditing={onSubmit}
          placeholder="Add or search anything…"
          returnKeyType="send"
          submitBehavior="submit"
          testID="time-composer-input"
          value={value}
        />
      </ComposerSurface>
    </ComposerDock>
  );
}
