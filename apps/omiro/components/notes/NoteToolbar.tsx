import type { SFSymbol } from 'expo-symbols';
import React from 'react';
import { InputAccessoryView, Keyboard, ScrollView, View } from 'react-native';

import type { FormatCommand } from '~/components/notes/note-formatting';
import { makeStyles, withAlpha } from '~/components/theme';
import { IconButton, nativeShadows } from '~/components/ui';
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
  return <View style={styles.s0} />;
}

function ToolbarButtons({ onAction }: NoteToolbarProps) {
  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}
        style={styles.s1}
      >
        <View style={styles.s2}>
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

        <View style={styles.s3}>
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

        <View style={styles.s4}>
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

        <View style={styles.s5}>
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
      <View style={[styles.s6, { borderCurve: 'continuous', boxShadow: nativeShadows.md }]}>
        <View style={styles.s7}>
          <ToolbarButtons {...props} />
        </View>
      </View>
    </InputAccessoryView>
  );
}

const styles = makeStyles((theme) => ({
  s0: { backgroundColor: theme.colors.border, height: 20, marginHorizontal: 16, width: 1 },
  s1: { flex: 1 },
  s2: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  s3: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  s4: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  s5: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  s6: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    alignSelf: 'stretch',
    flexDirection: 'row',
    height: 48,
    marginHorizontal: 16,
  },
  s7: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
}));
