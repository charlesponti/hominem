import { StyleSheet, TextInput as RNTextInput, type TextInputProps, View } from 'react-native'
import { Text, theme } from '~/theme'

function TextInput({ label, style, ...props }: TextInputProps & { label?: string }) {
  if (label) {
    return (
      <View style={styles.row}>
        <Text variant="label" color="mutedForeground" style={styles.label}>
          {label.toUpperCase()}
        </Text>
        <RNTextInput
          style={[styles.input, { textAlign: label ? 'right' : 'left' }, style]}
          placeholder={label.toUpperCase()}
          placeholderTextColor={theme.colors.mutedForeground}
          accessibilityLabel={label}
          {...props}
        />
      </View>
    )
  }

  return (
    <RNTextInput
      style={[styles.input, style]}
      placeholderTextColor={theme.colors.mutedForeground}
      {...props}
    />
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    rowGap: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.muted,
  },
  label: {
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    fontFamily: 'Geist Mono',
    fontSize: 14,
    color: theme.colors.foreground,
  },
})

export default TextInput
