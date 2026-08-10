import { useEffect, useRef } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

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

function Caret({ color }: { color: string }) {
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

  return (
    <Animated.View
      className="rounded-[1px] h-6 w-0.5"
      style={[{ backgroundColor: color }, style]}
    />
  );
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
      className="items-center rounded-md border h-14 justify-center w-12"
      style={[{ borderColor: resolvedBorderColor }, animatedStyle]}
    >
      {digit ? (
        <Text className="tabular-nums font-bold text-2xl" style={{ color: textColor }}>
          {digit}
        </Text>
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
  const [borderDefault, primary, destructive, textPrimary] = useCSSVariable([
    '--color-border',
    '--color-primary',
    '--color-destructive',
    '--color-foreground',
  ]) as string[];
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
      className="self-center"
      onPress={() => inputRef.current?.focus()}
      accessibilityRole="none"
    >
      <Animated.View
        className="flex-row gap-2"
        style={shakeStyle}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {cells.map((digit, index) => (
          <OtpCell
            // biome-ignore lint: stable fixed-length grid, index is the identity
            key={index}
            digit={digit}
            isFilled={Boolean(digit)}
            isActive={editable && index === activeIndex}
            hasError={error}
            borderColor={borderDefault}
            activeBorderColor={primary}
            errorBorderColor={destructive}
            textColor={textPrimary}
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
        className="h-full left-0 opacity-0 absolute top-0 w-full"
      />
    </Pressable>
  );
}
