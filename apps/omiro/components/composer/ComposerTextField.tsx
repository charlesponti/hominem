import { forwardRef } from 'react';
import { Host, TextInput, useNativeState } from '@expo/ui';
import type { TextInputRef } from '@expo/ui';

import { useThemeColors } from '~/components/theme';

const MAX_LINES = 5;

interface ComposerTextFieldProps {
  disabled?: boolean;
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

export const ComposerTextField = forwardRef<TextInputRef, ComposerTextFieldProps>(
  function ComposerTextField(
    {
      disabled = false,
      onBlur,
      onChangeText,
      onFocus,
      onSubmitEditing,
      placeholder,
      returnKeyType = 'default',
      submitBehavior = 'newline',
      testID,
      value,
    }: ComposerTextFieldProps,
    ref,
  ) {
    const themeColors = useThemeColors();
    const text = useNativeState(value);

    text.value = value;

    return (
      <Host style={{ borderColor: 'yellow', borderWidth: 2, width: '100%' }}>
        <TextInput
          ref={ref}
          editable={!disabled}
          multiline
          numberOfLines={MAX_LINES}
          onBlur={onBlur}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onSubmitEditing={onSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={themeColors.tertiary}
          returnKeyType={returnKeyType === 'default' && submitBehavior === 'newline' ? 'default' : 'send'}
          testID={testID}
          value={text}
        />
      </Host>
    );
  },
);
