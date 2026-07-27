import React from 'react';
import { TextInput } from 'react-native';
import Animated from 'react-native-reanimated';

import { TOOL_BTN_SIZE } from '~/components/composer/constants';
import { makeStyles, useThemeColors } from '~/components/theme';
import { createComposerReflowTransition } from '~/components/theme/animations';
import { spacing } from '~/components/theme/tokens';
import { useReducedMotion } from '~/hooks/use-reduced-motion';

interface ComposerTextInputProps {
  inputRef: React.RefObject<TextInput | null>;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  testID?: string;
  isColumnLayout: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

// Floor: keeps the input from ever rendering shorter than one comfortable
// line, so it doesn't jump-grow the instant the first character is typed.
const MIN_INPUT_HEIGHT = spacing[6] + spacing[4];
// Ceiling: caps multiline growth at roughly 9 lines; beyond that the input
// scrolls internally instead of pushing the composer any taller.
const MAX_INPUT_HEIGHT = spacing[6] * 9;

// In `idle` mode, the attach/mic buttons are positioned absolutely on top of the input's row.
// This is the horizontal space the input must leave clear on each side so typed text is not beneath the buttons.
export const IDLE_CLEARANCE = TOOL_BTN_SIZE + spacing[2];

export function ComposerTextInput({
  inputRef,
  value,
  onChangeText,
  placeholder,
  testID,
  isColumnLayout,
  onFocus,
  onBlur,
}: ComposerTextInputProps) {
  const themeColors = useThemeColors();
  const styles = useStyles();
  const prefersReducedMotion = useReducedMotion();

  return (
    // isColumnLayout: active/focused state, toolbar renders below as its own
    // row (see ComposerShell's controlsAnchorColumn) — the input can use the
    // full width. !isColumnLayout: idle state, the toolbar overlays this same
    // row instead (controlsAnchorOverlay) — inputContainerRowMode leaves
    // clearance so the input's text doesn't render under those icons.
    <Animated.View
      style={[styles.inputContainer, isColumnLayout ? null : styles.inputContainerRowMode]}
      layout={createComposerReflowTransition(prefersReducedMotion)}
    >
      <TextInput
        ref={inputRef}
        multiline
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={themeColors['tertiary']}
        cursorColor={themeColors.primary}
        selectionColor={themeColors.primary}
        style={styles.input}
        testID={testID}
      />
    </Animated.View>
  );
}

const useStyles = makeStyles((theme) => ({
  inputContainer: {
    flexShrink: 1,
    // Centers the TextInput vertically to vertically align the text with the toolbar icons
    justifyContent: 'center',
    maxHeight: MAX_INPUT_HEIGHT,
    minHeight: MIN_INPUT_HEIGHT,
    minWidth: 0,
  },
  inputContainerRowMode: {
    marginLeft: IDLE_CLEARANCE,
    marginRight: IDLE_CLEARANCE,
  },
  input: {
    color: theme.colors['text-primary'],
    fontSize: 18,
    lineHeight: 20,
    letterSpacing: 0,
    width: '100%',
  },
}));
