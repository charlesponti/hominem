import type { SFSymbol } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import { Text, View } from 'react-native';

import { makeStyles, useThemeColor } from '~/components/theme';
import { IconButton, TextField } from '~/components/ui';
import { Button } from '~/components/ui/button';
import AppIcon from '~/components/ui/icon';
import t from '~/translations';

interface InlineEnhanceTrayProps {
  instruction: string;
  onInstructionChange: (value: string) => void;
  onPresetSelect: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isEnhancing?: boolean;
  error?: string | null;
}

type EnhanceSuggestion = (typeof t.enhance.suggestions)[number];
const CUSTOM_SELECTION = '__custom__';

const suggestionIcons: Record<EnhanceSuggestion, SFSymbol> = {
  Fix: 'textformat.abc.dottedunderline',
  Shorten: 'arrow.down.right.and.arrow.up.left',
  Expand: 'arrow.up.left.and.arrow.down.right',
  Bullets: 'list.bullet',
};

export function InlineEnhanceTray({
  instruction,
  onInstructionChange,
  onPresetSelect,
  onCancel,
  onConfirm,
  isEnhancing = false,
  error = null,
}: InlineEnhanceTrayProps) {
  const [primary, mutedForeground, popover, textPrimary] = useThemeColor([
    '--color-primary',
    '--color-muted-foreground',
    '--color-popover',
    '--color-foreground',
  ]) as string[];
  const customInputRef = useRef<TextInput>(null);
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);

  useEffect(() => {
    if (isCustomOpen) {
      customInputRef.current?.focus();
    }
  }, [isCustomOpen]);

  const handleSelect = (selection: string) => {
    if (isEnhancing) {
      return;
    }

    if (selection === CUSTOM_SELECTION) {
      setSelectedSuggestion(CUSTOM_SELECTION);
      setIsCustomOpen(true);
      return;
    }

    setSelectedSuggestion(selection);
    setIsCustomOpen(false);
    onPresetSelect(selection);
  };

  return (
    <View style={styles.s0}>
      <View style={styles.s4}>
        {t.enhance.suggestions.map((suggestion) => (
          <IconButton
            key={suggestion}
            accessibilityLabel={suggestion}
            disabled={isEnhancing}
            variant="plain"
            onPress={() => handleSelect(suggestion)}
          >
            <AppIcon
              name={suggestionIcons[suggestion]}
              size={20}
              tintColor={selectedSuggestion === suggestion ? primary : mutedForeground}
            />
          </IconButton>
        ))}
        <IconButton
          accessibilityLabel="Custom"
          disabled={isEnhancing}
          variant="plain"
          onPress={() => handleSelect(CUSTOM_SELECTION)}
        >
          <AppIcon
            name="square.and.pencil"
            size={20}
            tintColor={selectedSuggestion === CUSTOM_SELECTION ? primary : mutedForeground}
          />
        </IconButton>
      </View>

      {isCustomOpen ? (
        <TextField
          ref={customInputRef}
          value={instruction}
          onChangeText={onInstructionChange}
          placeholder={t.enhance.instructionPlaceholder}
          style={{
            backgroundColor: popover,
            borderRadius: 12,
            color: textPrimary,
            fontSize: 15,
            lineHeight: 20,
            minHeight: 44,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
          returnKeyType="done"
          onSubmitEditing={onConfirm}
          editable={!isEnhancing}
        />
      ) : null}

      {isCustomOpen ? (
        <View style={styles.s1}>
          <Button label={t.enhance.cancel} onPress={onCancel} variant="outline" size="sm" />
          <Button
            label={t.enhance.confirm}
            onPress={onConfirm}
            variant="primary"
            size="sm"
            loading={isEnhancing}
          />
        </View>
      ) : null}

      {error ? <Text style={styles.s2}>{error}</Text> : null}
    </View>
  );
}

const styles = makeStyles((theme) => ({
  s0: { gap: 8, marginVertical: 16 },
  s1: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  s2: { color: theme.colors.destructive, lineHeight: 16 },
  s4: { flexDirection: 'row', alignItems: 'center', gap: 4 },
}));
