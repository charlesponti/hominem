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
import type { TextFieldBaseProps, TextFieldType } from './text-field.types';

interface TextFieldProps
  extends Omit<TextInputProps, 'accessibilityLabel' | 'editable'>, TextFieldBaseProps {
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  editable?: boolean | undefined;
  type?: TextFieldType | undefined;
}

const TextField = React.forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    containerStyle,
    disabled,
    editable,
    error,
    helpText,
    label,
    placeholder,
    style,
    type = 'text',
    ...props
  },
  ref,
) {
  const isEditable = editable ?? !disabled;
  const keyboardType =
    type === 'email' ? 'email-address' : type === 'search' ? 'web-search' : 'default';
  const secureTextEntry = type === 'password';

  return (
    <Field containerStyle={containerStyle} error={error} helpText={helpText} label={label}>
      <TextInput
        ref={ref}
        editable={isEditable}
        keyboardType={keyboardType}
        placeholder={placeholder ?? label}
        placeholderTextColor={colors['text-tertiary']}
        secureTextEntry={secureTextEntry}
        style={[
          styles.input,
          error ? styles.inputError : null,
          !isEditable ? styles.inputDisabled : null,
          style,
        ]}
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
    minHeight: 44,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  inputDisabled: {
    opacity: 0.5,
  },
  inputError: {
    borderColor: colors.destructive,
  },
});

export { TextField };
export type { TextFieldProps };
