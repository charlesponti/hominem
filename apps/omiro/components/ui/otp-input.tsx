import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { fontSizes, makeStyles, radii, themeSpacing, useThemeColors } from '~/components/theme';

interface OtpInputProps {
  length?: number;
  value: string;
  onChangeText: (value: string) => void;
  onSubmitEditing?: () => void;
  editable?: boolean;
  error?: boolean;
  autoFocus?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

const CELL_SIZE = 46;
const CELL_GAP = themeSpacing.sm;

const useStyles = makeStyles(() => ({
  wrap: {
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  cell: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    height: 56,
    justifyContent: 'center',
    width: CELL_SIZE,
  },
  cellText: {
    fontSize: fontSizes.lg + 6,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  caret: {
    borderRadius: 1,
    height: 22,
    width: 2,
  },
  hiddenInput: {
    height: '100%',
    left: 0,
    opacity: 0,
    position: 'absolute',
    top: 0,
    width: '100%',
  },
}));

function Caret({ color }: { color: string }) {
  const styles = useStyles();
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 450, easing: Easing.linear }),
        withTiming(1, { duration: 450, easing: Easing.linear }),
      ),
      -1,
    );
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.caret, { backgroundColor: color }, style]} />;
}

function OtpCell({
  digit,
  isActive,
  isFilled,
  hasError,
  borderColor,
  activeBorderColor,
  errorBorderColor,
  textColor,
}: {
  digit: string;
  isActive: boolean;
  isFilled: boolean;
  hasError: boolean;
  borderColor: string;
  activeBorderColor: string;
  errorBorderColor: string;
  textColor: string;
}) {
  const styles = useStyles();
  const scale = useSharedValue(1);
  const prevFilled = useRef(false);

  useEffect(() => {
    if (isFilled && !prevFilled.current) {
      scale.value = withSequence(
        withTiming(1.12, { duration: 90, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }),
      );
    }
    prevFilled.current = isFilled;
  }, [isFilled, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const resolvedBorderColor = hasError
    ? errorBorderColor
    : isActive
      ? activeBorderColor
      : borderColor;

  return (
    <Animated.View
      style={[styles.cell, { borderColor: resolvedBorderColor }, animatedStyle]}
    >
      {digit ? (
        <Text style={[styles.cellText, { color: textColor }]}>{digit}</Text>
      ) : isActive ? (
        <Caret color={activeBorderColor} />
      ) : null}
    </Animated.View>
  );
}

export function OtpInput({
  length = 6,
  value,
  onChangeText,
  onSubmitEditing,
  editable = true,
  error = false,
  autoFocus = false,
  testID,
  accessibilityLabel,
}: OtpInputProps) {
  const styles = useStyles();
  const themeColors = useThemeColors();
  const inputRef = useRef<TextInput>(null);

  const shakeX = useSharedValue(0);
  useEffect(() => {
    if (!error) return;
    shakeX.value = withSequence(
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(7, { duration: 50 }),
      withTiming(-7, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  }, [error, shakeX]);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const cells = Array.from({ length }, (_, index) => value[index] ?? '');
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <Pressable
      style={styles.wrap}
      onPress={() => inputRef.current?.focus()}
      accessibilityRole="none"
    >
      <Animated.View style={[styles.row, shakeStyle]}>
        {cells.map((digit, index) => (
          <OtpCell
            // biome-ignore lint: stable fixed-length grid, index is the identity
            key={index}
            digit={digit}
            isFilled={Boolean(digit)}
            isActive={editable && index === activeIndex}
            hasError={error}
            borderColor={themeColors['border-default']}
            activeBorderColor={themeColors.primary}
            errorBorderColor={themeColors.destructive}
            textColor={themeColors['text-primary']}
          />
        ))}
      </Animated.View>
      <TextInput
        ref={inputRef}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        value={value}
        onChangeText={(text) => onChangeText(text.slice(0, length))}
        onSubmitEditing={onSubmitEditing}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        editable={editable}
        returnKeyType="done"
        maxLength={length}
        caretHidden
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}
