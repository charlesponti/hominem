import React, { useCallback, useState } from 'react';
import type { NativeSyntheticEvent, TextInputContentSizeChangeEventData } from 'react-native';
import { TextInput } from 'react-native';

import { componentSizes, fontSizes, lineHeights, makeStyles, useThemeColors } from '~/components/theme';

const MAX_LINES = 5;
const TEXT_VERTICAL_PADDING = (componentSizes.xl - lineHeights.body) / 2;
const MAX_INPUT_HEIGHT = lineHeights.body * MAX_LINES + TEXT_VERTICAL_PADDING * 2;

function getComposerInputHeight(contentHeight: number) {
  return Math.min(MAX_INPUT_HEIGHT, Math.max(componentSizes.xl, contentHeight));
}

interface ComposerTextFieldProps {
  accessibilityLabel?: string;
  disabled?: boolean;
  inputRef?: React.RefObject<TextInput | null>;
  onBlur?: () => void;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  onSubmitEditing?: () => void;
  placeholder: string;
  returnKeyType?: 'default' | 'send';
  submitBehavior?: 'blurAndSubmit' | 'newline' | 'submit';
  testID?: string;
  value: string;
}

export function ComposerTextField({
  accessibilityLabel,
  disabled = false,
  inputRef,
  onBlur,
  onChangeText,
  onFocus,
  onSubmitEditing,
  placeholder,
  returnKeyType = 'default',
  submitBehavior = 'newline',
  testID,
  value,
}: ComposerTextFieldProps) {
  const styles = useStyles();
  const themeColors = useThemeColors();
  const [height, setHeight] = useState<number>(componentSizes.xl);
  const onContentSizeChange = useCallback(
    (event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) =>
      setHeight(getComposerInputHeight(event.nativeEvent.contentSize.height)),
    [],
  );

  return (
    <TextInput
      ref={inputRef}
      accessibilityLabel={accessibilityLabel}
      cursorColor={themeColors.primary}
      editable={!disabled}
      multiline
      onBlur={onBlur}
      onChangeText={onChangeText}
      onContentSizeChange={onContentSizeChange}
      onFocus={onFocus}
      onSubmitEditing={onSubmitEditing}
      placeholder={placeholder}
      placeholderTextColor={themeColors.tertiary}
      returnKeyType={returnKeyType}
      scrollEnabled={height >= MAX_INPUT_HEIGHT}
      selectionColor={themeColors.primary}
      style={[styles.input, { height }]}
      submitBehavior={submitBehavior}
      testID={testID}
      value={value}
    />
  );
}

const useStyles = makeStyles((theme) => ({
  input: {
    color: theme.colors['text-primary'],
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
    maxHeight: MAX_INPUT_HEIGHT,
    minHeight: componentSizes.xl,
    paddingHorizontal: 0,
    paddingVertical: TEXT_VERTICAL_PADDING,
    width: '100%',
  },
}));
