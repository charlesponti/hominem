import { IconButton, nativeShadows } from '@ponti-studios/ui/native';
import type { SFSymbol } from 'expo-symbols';
import React from 'react';
import { InputAccessoryView, Keyboard, ScrollView, View } from 'react-native';

import type { FormatCommand } from '~/components/notes/note-formatting';
import AppIcon from '~/components/ui/icon';
import t from '~/translations';

export const NOTE_TOOLBAR_ID = 'note-editor-toolbar';

interface NoteToolbarProps {
  onAction: (action: FormatCommand) => void;
}

interface ToolbarButtonProps {
  icon: SFSymbol;
  onPress: () => void;
  disabled?: boolean;
  label: string;
}

function ToolbarButton({ icon, onPress, disabled = false, label }: ToolbarButtonProps) {
  return (
    <IconButton accessibilityLabel={label} disabled={disabled} onPress={onPress}>
      <AppIcon name={icon} size={20} />
    </IconButton>
  );
}

function ToolbarDivider() {
  return <View className="bg-border h-5 mx-4 w-px" />;
}

function ToolbarButtons({ onAction }: NoteToolbarProps) {
  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}
        className="flex-1"
      >
        <View className="items-center flex-row gap-2">
          <ToolbarButton
            icon="bold"
            label={t.notes.toolbar.bold}
            onPress={() => onAction('bold')}
          />
          <ToolbarButton
            icon="italic"
            label={t.notes.toolbar.italic}
            onPress={() => onAction('italic')}
          />
          <ToolbarButton
            icon="strikethrough"
            label={t.notes.toolbar.strikethrough}
            onPress={() => onAction('strikethrough')}
          />
          <ToolbarButton
            icon="curlybraces"
            label={t.notes.toolbar.inlineCode}
            onPress={() => onAction('code')}
          />
        </View>

        <ToolbarDivider />

        <View className="items-center flex-row gap-2">
          <ToolbarButton
            icon="textformat.size.larger"
            label={t.notes.toolbar.heading}
            onPress={() => onAction('heading')}
          />
          <ToolbarButton
            icon="text.quote"
            label={t.notes.toolbar.blockquote}
            onPress={() => onAction('blockquote')}
          />
        </View>

        <ToolbarDivider />

        <View className="items-center flex-row gap-2">
          <ToolbarButton
            icon="checklist"
            label={t.notes.toolbar.checklist}
            onPress={() => onAction('checklist')}
          />
          <ToolbarButton
            icon="list.bullet"
            label={t.notes.toolbar.bulletList}
            onPress={() => onAction('bullet')}
          />
          <ToolbarButton
            icon="list.number"
            label={t.notes.toolbar.numberedList}
            onPress={() => onAction('numbered-list')}
          />
        </View>

        <ToolbarDivider />

        <View className="items-center flex-row gap-2">
          <ToolbarButton
            icon="increase.indent"
            label={t.notes.toolbar.indent}
            onPress={() => onAction('indent')}
          />
          <ToolbarButton
            icon="decrease.indent"
            label={t.notes.toolbar.outdent}
            onPress={() => onAction('outdent')}
          />
        </View>
      </ScrollView>

      <ToolbarDivider />

      <ToolbarButton
        icon="keyboard.chevron.compact.down"
        label={t.notes.toolbar.dismissKeyboard}
        onPress={Keyboard.dismiss}
      />
    </>
  );
}

export function NoteToolbar(props: NoteToolbarProps) {
  return (
    <InputAccessoryView nativeID={NOTE_TOOLBAR_ID} backgroundColor="transparent">
      <View
        className="bg-card border border-border rounded-lg self-stretch flex-row h-12 mx-4"
        style={{ borderCurve: 'continuous', boxShadow: nativeShadows.md }}
      >
        <View className="items-center flex-row flex-1 px-0 py-0">
          <ToolbarButtons {...props} />
        </View>
      </View>
    </InputAccessoryView>
  );
}
