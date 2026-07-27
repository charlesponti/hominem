import React from 'react';
import type { TextInput } from 'react-native';

import { ComposerTextField } from './ComposerTextField';

interface ComposerTextInputProps {
  inputRef: React.RefObject<TextInput | null>;
  onBlur?: () => void;
  onChangeText: (text: string) => void;
  onFocus?: () => void;
  placeholder: string;
  testID?: string;
  value: string;
}

export function ComposerTextInput({
  inputRef,
  onBlur,
  onChangeText,
  onFocus,
  placeholder,
  testID,
  value,
}: ComposerTextInputProps) {
  return (
    <ComposerTextField
      inputRef={inputRef}
      onBlur={onBlur}
      onChangeText={onChangeText}
      onFocus={onFocus}
      placeholder={placeholder}
      testID={testID}
      value={value}
    />
  );
}
