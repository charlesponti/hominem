import React from 'react'

export const StyleSheet = {
  create: (styles) => styles,
  absoluteFillObject: {},
  flatten: (style) => {
    if (Array.isArray(style)) {
      return Object.assign({}, ...style.filter(Boolean))
    }

    return style ?? {}
  },
}

export const View = ({ children, testID }) =>
  React.createElement('View', { testID }, children)

export const Text = ({ children, testID }) =>
  React.createElement('Text', { testID }, children)

export const KeyboardAvoidingView = ({ children, ...props }) =>
  React.createElement('KeyboardAvoidingView', props, children)
export const Pressable = ({ children, ...props }) => React.createElement('Pressable', props, children)
export const ScrollView = ({ children, ...props }) => React.createElement('ScrollView', props, children)
export const TouchableOpacity = ({ children, ...props }) =>
  React.createElement('TouchableOpacity', props, children)
export const Platform = {
  OS: 'ios',
}
export const TextInput = ({ value, placeholder, testID }) =>
  React.createElement('TextInput', {
    testID,
    placeholder,
    readOnly: true,
    value: value ?? '',
  })
