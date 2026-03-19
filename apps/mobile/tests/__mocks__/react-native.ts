import React from 'react'

export const StyleSheet = {
  create: (styles) => styles,
  absoluteFillObject: {},
}

export const View = ({ children, testID }) =>
  React.createElement('div', { 'data-testid': testID }, children)

export const Text = ({ children, testID }) =>
  React.createElement('span', { 'data-testid': testID }, children)

export const Pressable = View
export const ScrollView = View
export const TouchableOpacity = View
export const TextInput = ({ value, placeholder, testID }) =>
  React.createElement('input', {
    'data-testid': testID,
    placeholder,
    readOnly: true,
    value: value ?? '',
  })
