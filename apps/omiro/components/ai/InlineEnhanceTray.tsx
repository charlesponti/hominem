import { Host, Picker, Label as SwiftUILabel } from '@expo/ui/swift-ui';
import { environment, labelStyle, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { useColorMode } from '@ponti-studios/ui/native';
import type { SFSymbol } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import type { TextInput } from 'react-native';

import { makeStyles, Text, useThemeColors } from '~/components/theme';
import { radii, spacing } from '~/components/theme/tokens';
import { Button } from '~/components/ui/button';
import { TextField } from '~/components/ui/text-field';
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
  const themeColors = useThemeColors();
  const styles = useStyles();
  const colorScheme = useColorMode();
  const customInputRef = useRef<TextInput>(null);
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  useEffect(() => {
    if (isCustomOpen) {
      customInputRef.current?.focus();
    }
  }, [isCustomOpen]);

  const handleSuggestionChange = (selection: string | number) => {
    if (isEnhancing) {
      return;
    }

    if (String(selection) === CUSTOM_SELECTION) {
      setIsCustomOpen(true);
      return;
    }

    setIsCustomOpen(false);
    onPresetSelect(String(selection));
  };

  return (
    <View style={[styles.container]}>
      {/* <View style={styles.header}>
        <View style={styles.iconWrap}>
          <AppIcon name="wand.and.sparkles" size={16} tintColor={themeColors['text-secondary']} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t.enhance.title}</Text>
          <Text style={styles.subtitle}>{t.enhance.subtitle}</Text>
        </View>
      </View> */}

      <View style={styles.pickerRow}>
        <Host style={styles.pickerHost}>
          <Picker
            selection={isCustomOpen ? CUSTOM_SELECTION : instruction}
            modifiers={[
              environment({ key: 'colorScheme', value: colorScheme }),
              pickerStyle('segmented'),
            ]}
            onSelectionChange={handleSuggestionChange}
          >
            {t.enhance.suggestions.map((suggestion) => (
              <SwiftUILabel
                key={suggestion}
                title={suggestion}
                systemImage={suggestionIcons[suggestion]}
                modifiers={[labelStyle('iconOnly'), tag(suggestion)]}
              />
            ))}
            <SwiftUILabel
              title="Custom"
              systemImage="square.and.pencil"
              modifiers={[labelStyle('iconOnly'), tag(CUSTOM_SELECTION)]}
            />
          </Picker>
        </Host>
      </View>

      {isCustomOpen ? (
        <TextField
          ref={customInputRef}
          value={instruction}
          onChangeText={onInstructionChange}
          placeholder={t.enhance.instructionPlaceholder}
          placeholderTextColor={themeColors['tertiary']}
          style={[
            styles.input,
            {
              backgroundColor: themeColors['popover'],
              color: themeColors['text-primary'],
            },
          ]}
          returnKeyType="done"
          onSubmitEditing={onConfirm}
          editable={!isEnhancing}
        />
      ) : null}

      {isCustomOpen ? (
        <View style={styles.actions}>
          <View style={styles.actionSlot}>
            <Button label={t.enhance.cancel} onPress={onCancel} variant="outline" size="sm" />
          </View>
          <View style={styles.actionSlot}>
            <Button
              label={t.enhance.confirm}
              onPress={onConfirm}
              variant="primary"
              size="sm"
              loading={isEnhancing}
            />
          </View>
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  container: {
    gap: spacing[3],
    paddingTop: spacing[1],
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing[2],
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: theme.colors['card'],
    borderRadius: radii.full,
    height: spacing[6],
    justifyContent: 'center',
    overflow: 'hidden',
    width: spacing[6],
  },
  headerText: {
    flex: 1,
    gap: spacing[1],
  },
  title: {
    color: theme.colors['text-primary'],
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  subtitle: {
    color: theme.colors['text-secondary'],
    fontSize: 13,
    lineHeight: 18,
  },
  pickerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  pickerHost: {
    flex: 1,
    height: 44,
  },
  input: {
    borderRadius: radii.md,
    fontSize: 15,
    lineHeight: 20,
    minHeight: 44,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2] + 2,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  actionSlot: {
    flex: 1,
  },
  errorText: {
    color: theme.colors.destructive,
    fontSize: 12,
    lineHeight: 16,
  },
}));
