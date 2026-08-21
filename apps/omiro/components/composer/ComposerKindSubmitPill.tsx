import type { SFSymbol } from 'expo-symbols';
import { Pressable, View } from 'react-native';

import { makeStyles, useThemeColor } from '~/components/theme';
import AppIcon from '~/components/ui/icon';

import type { ComposerEntryKind } from './composer.types';

const SEGMENT_SIZE = 32;

const options: { kind: ComposerEntryKind; icon: SFSymbol; iconFilled: SFSymbol }[] = [
  {
    kind: 'chat',
    icon: 'bubble.left.and.bubble.right',
    iconFilled: 'bubble.left.and.bubble.right.fill',
  },
  { kind: 'note', icon: 'doc.text', iconFilled: 'doc.text.fill' },
];

interface ComposerKindSubmitPillProps {
  selected: ComposerEntryKind;
  disabled: boolean;
  accessibilityLabels: Record<ComposerEntryKind, string>;
  onSubmit: (kind: ComposerEntryKind) => void;
}

// Replaces the mixed-mode inbox composer's separate note/chat toggle + send
// button with a single pill: tapping an icon submits directly as that kind,
// rather than selecting a kind and then pressing a distinct send action.
export function ComposerKindSubmitPill({
  selected,
  disabled,
  accessibilityLabels,
  onSubmit,
}: ComposerKindSubmitPillProps) {
  const [primary, mutedForeground, muted] = useThemeColor([
    '--color-primary',
    '--color-muted-foreground',
    '--color-muted',
  ]) as string[];

  return (
    <View style={[styles.pill, { backgroundColor: muted }]} testID="composer-kind-submit-pill">
      {options.map((option) => {
        const isSelected = option.kind === selected;
        return (
          <Pressable
            accessibilityLabel={accessibilityLabels[option.kind]}
            accessibilityRole="button"
            disabled={disabled}
            key={option.kind}
            onPress={() => onSubmit(option.kind)}
            style={[styles.option, disabled && styles.disabledOption]}
            testID={`composer-submit-${option.kind === 'chat' ? 'chat' : 'note'}`}
          >
            <AppIcon
              name={isSelected ? option.iconFilled : option.icon}
              size={18}
              tintColor={isSelected ? primary : mutedForeground}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = makeStyles(() => ({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    gap: 2,
    padding: 2,
  },
  option: {
    alignItems: 'center',
    height: SEGMENT_SIZE,
    justifyContent: 'center',
    width: SEGMENT_SIZE,
  },
  disabledOption: { opacity: 0.4 },
}));
