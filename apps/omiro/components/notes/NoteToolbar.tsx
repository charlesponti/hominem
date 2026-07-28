import { GlassView } from 'expo-glass-effect';
import type { SFSymbol } from 'expo-symbols';
import React from 'react';
import { InputAccessoryView, Keyboard, ScrollView, View } from 'react-native';

import type { FormatCommand } from '~/components/notes/note-formatting';
import { makeStyles } from '~/components/theme';
import { IconButton } from '~/components/ui/icon-button';
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
    <IconButton
      accessibilityLabel={label}
      disabled={disabled}
      icon={icon}
      onPress={onPress}
    />
  );
}

function ToolbarDivider() {
  const styles = useToolbarStyles();
  return <View style={styles.divider} />;
}

function ToolbarButtons({ onAction }: NoteToolbarProps) {
  const styles = useToolbarStyles();
  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={styles.scrollContent}
        style={styles.scroll}
      >
        <View style={styles.group}>
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

        <View style={styles.group}>
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

        <View style={styles.group}>
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

        <View style={styles.group}>
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
  const styles = useToolbarStyles();
  return (
    <InputAccessoryView nativeID={NOTE_TOOLBAR_ID} backgroundColor="transparent">
      <GlassView style={styles.glass}>
        <View style={styles.container}>
          <ToolbarButtons {...props} />
        </View>
      </GlassView>
    </InputAccessoryView>
  );
}

const useToolbarStyles = makeStyles((theme) => ({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  glass: {
    alignSelf: 'stretch',
    borderRadius: 12,
    flexDirection: 'row',
    height: 48,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  group: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  divider: {
    backgroundColor: theme.colors['border-default'],
    height: 20,
    marginHorizontal: theme.spacing.sm,
    width: 1,
  },
}));
