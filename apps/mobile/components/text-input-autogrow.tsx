import React, { useEffect, useRef } from 'react'
import { StyleSheet, TextInput, type TextInputProps } from 'react-native'

import { theme } from '~/theme'

const AutoGrowingInput = ({
  editable,
  onChangeText,
  placeholder,
  value,
  ...props
}: TextInputProps) => {
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    if (editable && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editable])

  return (
    <TextInput
      ref={inputRef}
      style={[
        styles.input,
        { color: value && value.length > 0 ? theme.colors.black : theme.colors.grayLight },
        props.style,
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder ?? `What's up?`}
      multiline
      {...props}
    />
  )
}

const styles = StyleSheet.create({
  input: {
    alignSelf: 'stretch',
    fontSize: 20,
    paddingVertical: 16,
    flexWrap: 'wrap',
  },
})

export default AutoGrowingInput
