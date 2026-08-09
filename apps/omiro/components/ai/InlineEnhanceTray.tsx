import { Host, Picker, Label as SwiftUILabel } from '@expo/ui/swift-ui';
import { environment, labelStyle, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { TextField, useColorMode } from '@ponti-studios/ui/native';
import type { SFSymbol } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import { Text, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import { Button } from '~/components/ui/button';
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
  const [popover, textPrimary] = useCSSVariable([
    '--color-popover',
    '--color-foreground',
  ]) as string[];
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
    <View className="gap-2">
      <View style={{ flex: 1 }}>
        <Host style={{ flex: 1, height: 44 }}>
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
        <View className="flex-row justify-end gap-2">
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

      {error ? <Text className="text-destructive text-xs leading-4">{error}</Text> : null}
    </View>
  );
}
