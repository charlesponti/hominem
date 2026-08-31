import { useCallback, useRef, useState } from 'react';
import type { NativeSyntheticEvent, TextInputSelectionChangeEventData } from 'react-native';

import { applyFormatCommand } from '~/components/notes/note-formatting';
import type { FormatCommand, TextSelection } from '~/components/notes/note-formatting';

export function useNoteFormatting() {
  const selectionRef = useRef<TextSelection>({ start: 0, end: 0 });
  const hasKnownSelectionRef = useRef(false);
  const [controlledSelection, setControlledSelection] = useState<TextSelection | undefined>(
    undefined,
  );

  const onSelectionChange = useCallback(
    (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      selectionRef.current = e.nativeEvent.selection;
      hasKnownSelectionRef.current = true;
      setControlledSelection(undefined);
    },
    [],
  );

  // The very first tap on a TextInput both focuses it and positions the
  // cursor, but `onSelectionChange` for that tap can land after a fast
  // follow-up press on a format button (no synchronous way to read native
  // selection). So until a real selection event shows up, assume the cursor
  // is at the end of the content rather than the `{0,0}` ref default --
  // guessing "end" is harmless, guessing "start of the note" is not.
  const onFocus = useCallback((content: string) => {
    if (!hasKnownSelectionRef.current) {
      selectionRef.current = { start: content.length, end: content.length };
    }
  }, []);

  const applyFormat = useCallback((content: string, command: FormatCommand) => {
    const result = applyFormatCommand(content, selectionRef.current, command);
    setControlledSelection(result.selection);
    return result.text;
  }, []);

  return {
    onSelectionChange,
    onFocus,
    applyFormat,
    controlledSelection,
  };
}
