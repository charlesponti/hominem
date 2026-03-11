import * as React from 'react'
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native'

import { colors, fontFamiliesNative, fontSizes, fontWeights, spacing } from '../../tokens'
import type { TextFieldBaseProps, TextFieldType } from './text-field.types'

interface TextFieldProps
  extends Omit<TextInputProps, 'accessibilityLabel' | 'editable'>,
    TextFieldBaseProps {
  style?: StyleProp<TextStyle>
  containerStyle?: StyleProp<ViewStyle>
  editable?: boolean | undefined
  type?: TextFieldType | undefined
}

function TextField({
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
}: TextFieldProps) {
  const describedText = error ?? helpText
  const isEditable = editable ?? !disabled
  const keyboardType =
    type === 'email'
      ? 'email-address'
      : type === 'search'
        ? 'web-search'
        : 'default'
  const secureTextEntry = type === 'password'

  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        accessibilityHint={describedText}
        accessibilityLabel={label}
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
      {describedText ? (
        <Text style={error ? styles.errorText : styles.helpText}>{describedText}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  errorText: {
    color: colors.destructive,
    fontFamily: fontFamiliesNative.primary,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.regular,
    lineHeight: Math.round(fontSizes.xs * 1.4),
    marginTop: spacing[1],
  },
  helpText: {
    color: colors['text-tertiary'],
    fontFamily: fontFamiliesNative.primary,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.regular,
    lineHeight: Math.round(fontSizes.xs * 1.4),
    marginTop: spacing[1],
  },
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
  label: {
    color: colors['text-secondary'],
    fontFamily: fontFamiliesNative.primary,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    lineHeight: Math.round(fontSizes.xs * 1.4),
    marginBottom: spacing[2],
  },
})

export { TextField }
export type { TextFieldProps }
