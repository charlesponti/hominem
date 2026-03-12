import * as React from 'react';
import {
  StyleSheet,
  TextInput,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, fontFamiliesNative, fontSizes, spacing } from '../../tokens';
import { Field } from './field.native';
import type { TextAreaBaseProps } from './text-area.types';

interface TextAreaProps
  extends Omit<TextInputProps, 'accessibilityLabel' | 'editable' | 'multiline'>, TextAreaBaseProps {
  containerStyle?: StyleProp<ViewStyle>;
  editable?: boolean | undefined;
  style?: StyleProp<TextStyle>;
}

const TextArea = React.forwardRef<TextInput, TextAreaProps>(function TextArea(
  { containerStyle, disabled, editable, error, helpText, label, placeholder, style, ...props },
  ref,
) {
  const isEditable = editable ?? !disabled;

  return (
    <Field containerStyle={containerStyle} error={error} helpText={helpText} label={label}>
      <TextInput
        ref={ref}
        editable={isEditable}
        multiline
        placeholder={placeholder ?? label}
        placeholderTextColor={colors['text-tertiary']}
        style={[
          styles.input,
          error ? styles.inputError : null,
          !isEditable ? styles.inputDisabled : null,
          style,
        ]}
        textAlignVertical="top"
        {...props}
      />
    </Field>
  );
});

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.muted,
    borderColor: colors['border-default'],
    borderRadius: 10,
    borderWidth: 1,
    color: colors.foreground,
    fontFamily: fontFamiliesNative.mono,
    fontSize: fontSizes.sm,
    minHeight: 120,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  inputDisabled: {
    opacity: 0.5,
  },
  inputError: {
    borderColor: colors.destructive,
  },
});

export { TextArea };
export type { TextAreaProps };
